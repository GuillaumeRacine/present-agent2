#!/usr/bin/env python3
"""
Present Agent Chat TUI

Terminal chat interface for the gift recommendation API.
Supports multi-turn conversations with clarifying questions and product recommendations.
"""

import json
import os
import random
import sys
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

try:
    from textual.app import App, ComposeResult
    from textual.binding import Binding
    from textual.containers import Horizontal, Vertical, VerticalScroll
    from textual.widgets import Footer, Header, Input, Static, Button, Label
    from textual.reactive import reactive
    from textual.worker import Worker, get_current_worker
    from textual import work
    from textual.message import Message
except ImportError:
    print("ERROR: textual not installed. Run: python3 -m pip install 'textual>=0.61.0'", file=sys.stderr)
    raise

try:
    from rich.text import Text
    from rich.panel import Panel
    from rich.table import Table
    from rich.console import Console
    from rich.columns import Columns
except ImportError:
    print("ERROR: rich not installed. Run: python3 -m pip install 'rich>=13.7.0'", file=sys.stderr)
    raise


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

API_BASE = os.getenv("PRESENT_API_URL", "http://localhost:3000")
USER_ID = os.getenv("PRESENT_USER_ID", "tui-user")


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class SuggestedAnswer:
    label: str
    value: Any
    description: str = ""


@dataclass
class ClarifyingQuestion:
    id: str
    question: str
    suggested_answers: List[SuggestedAnswer] = field(default_factory=list)
    field_name: str = ""
    type: str = ""


@dataclass
class ProductRec:
    rank: int
    title: str
    price: float
    vendor: str
    reasoning: str
    confidence: float = 0.0
    tags: List[str] = field(default_factory=list)
    image_url: str = ""
    is_bestseller: bool = False
    gift_proven: bool = False
    currency: str = "USD"
    product_url: str = ""
    description: str = ""


@dataclass
class ApiResponse:
    mode: str  # clarifying | recommendations | recommendations_with_refinement | no_results
    session_id: str = ""
    # Clarifying mode
    questions: List[ClarifyingQuestion] = field(default_factory=list)
    natural_language: str = ""
    encouragement: str = ""
    # Recommendations mode
    recommendations: List[ProductRec] = field(default_factory=list)
    conversational_intro: str = ""
    conversational_outro: str = ""
    quality_scorecard: Dict[str, Any] = field(default_factory=dict)
    # No-results mode
    no_results_message: str = ""
    no_results_suggestions: List[str] = field(default_factory=list)
    # Performance
    total_time_ms: int = 0
    agent_timings: Dict[str, int] = field(default_factory=dict)
    # Raw for debug
    raw: Dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# API client
# ---------------------------------------------------------------------------

def call_recommend(
    query: str,
    session_id: str,
    clarifications: Optional[Dict] = None,
    original_query: Optional[str] = None,
    skip_questions: bool = False,
) -> ApiResponse:
    """Call POST /api/recommend and parse response."""
    body: Dict[str, Any] = {
        "userQuery": query,
        "userId": USER_ID,
        "sessionId": session_id,
    }
    if clarifications:
        body["clarifications"] = clarifications
    if original_query:
        body["originalQuery"] = original_query
    if skip_questions:
        body["skipQuestions"] = True

    data = json.dumps(body).encode("utf-8")
    req = Request(
        f"{API_BASE}/api/recommend",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    resp = urlopen(req, timeout=120)
    raw = json.loads(resp.read().decode("utf-8"))

    return _parse_response(raw)


def _parse_response(raw: Dict[str, Any]) -> ApiResponse:
    mode = raw.get("mode", "recommendations")
    perf = raw.get("performance", {})

    result = ApiResponse(
        mode=mode,
        session_id=raw.get("sessionId", ""),
        total_time_ms=perf.get("totalExecutionTimeMs", 0),
        agent_timings=perf.get("agentTimings", {}),
        raw=raw,
    )

    if mode == "no_results":
        result.no_results_message = raw.get("message", "No products found.")
        result.no_results_suggestions = raw.get("suggestions", [])
        return result

    if mode == "clarifying":
        result.natural_language = raw.get("naturalLanguage", "")
        result.encouragement = raw.get("encouragement", "")
        for q in raw.get("questions", []):
            cq = ClarifyingQuestion(
                id=q.get("id", ""),
                question=q.get("question", ""),
                field_name=q.get("field", ""),
                type=q.get("type", ""),
            )
            for sa in q.get("suggestedAnswers", []):
                cq.suggested_answers.append(SuggestedAnswer(
                    label=sa.get("label", ""),
                    value=sa.get("value", ""),
                    description=sa.get("description", ""),
                ))
            result.questions.append(cq)
    else:
        recs_data = raw.get("recommendations", raw.get("finalRecommendations", {}))
        result.conversational_intro = recs_data.get("conversationalIntro", "")
        result.conversational_outro = recs_data.get("conversationalOutro", "")
        for r in recs_data.get("recommendations", []):
            prod = r.get("product", {})
            result.recommendations.append(ProductRec(
                rank=r.get("rank", 0),
                title=prod.get("title", "Unknown"),
                price=prod.get("price", 0),
                vendor=prod.get("vendor", ""),
                reasoning=r.get("reasoning", ""),
                confidence=r.get("confidence", 0),
                tags=r.get("tags", []),
                image_url=prod.get("imageUrl", ""),
                is_bestseller=prod.get("isBestseller", False),
                gift_proven=prod.get("giftProven", False),
                currency=prod.get("currency", "USD"),
                product_url=prod.get("id", ""),
                description=prod.get("description", ""),
            ))
        result.quality_scorecard = raw.get("qualityScorecard", {})

        # Handle refinement questions in hybrid mode
        if mode == "recommendations_with_refinement":
            for q in raw.get("refinementQuestions", []):
                cq = ClarifyingQuestion(
                    id=q.get("id", ""),
                    question=q.get("question", ""),
                    field_name=q.get("field", ""),
                    type=q.get("type", ""),
                )
                for sa in q.get("suggestedAnswers", []):
                    cq.suggested_answers.append(SuggestedAnswer(
                        label=sa.get("label", ""),
                        value=sa.get("value", ""),
                        description=sa.get("description", ""),
                    ))
                result.questions.append(cq)

    return result


# ---------------------------------------------------------------------------
# Rich rendering helpers
# ---------------------------------------------------------------------------

def render_user_message(text: str) -> str:
    """Render a user message with Rich markup."""
    return f"[bold cyan]You:[/bold cyan] {text}"


def render_assistant_text(text: str) -> str:
    """Render assistant conversational text."""
    return f"[bold green]Present Agent:[/bold green] {text}"


def render_clarifying_intro(resp: ApiResponse) -> str:
    """Render just the intro sentence (not the full naturalLanguage which duplicates the buttons)."""
    if resp.natural_language:
        # The API's naturalLanguage contains the full formatted questions.
        # Extract only the first sentence/paragraph as an intro.
        text = resp.natural_language.strip()
        # Split on double newline — first paragraph is the intro
        first_para = text.split("\n\n")[0].strip()
        # If it's still very long (contains question text), truncate to first sentence
        if len(first_para) > 150:
            for end in (".", "!", "?", ":"):
                idx = first_para.find(end)
                if 10 < idx < 150:
                    first_para = first_para[: idx + 1]
                    break
        return f"[bold green]Present Agent:[/bold green] {first_para}"
    return "[bold green]Present Agent:[/bold green] I have a few questions to find the perfect gift:"


def render_clarifying_hint(resp: ApiResponse) -> str:
    """Render hint text below clarifying questions."""
    lines = []
    if resp.encouragement:
        lines.append(f"[dim italic]{resp.encouragement}[/dim italic]")
    lines.append("[dim]Click an answer or type your own. 'skip' to get recommendations now.[/dim]")
    return "\n".join(lines)


def render_product_card(rec: ProductRec) -> str:
    """Render a single product recommendation as Rich markup."""
    lines = []

    # Header with rank and title
    badges = ""
    if rec.is_bestseller:
        badges += " [on dark_orange3] BESTSELLER [/on dark_orange3]"
    if rec.gift_proven:
        badges += " [on dark_green] GIFT PROVEN [/on dark_green]"
    for tag in rec.tags:
        badges += f" [on blue] {tag} [/on blue]"

    lines.append(f"[bold white on rgb(40,40,60)] #{rec.rank} [/bold white on rgb(40,40,60)] [bold]{rec.title}[/bold]{badges}")

    # Price and vendor
    currency_sym = "$" if rec.currency == "USD" else rec.currency + " "
    lines.append(f"  [green]{currency_sym}{rec.price:.2f}[/green]  [dim]from[/dim] [cyan]{rec.vendor}[/cyan]")

    # Confidence bar
    conf_pct = int(rec.confidence * 100)
    bar_filled = int(rec.confidence * 20)
    bar_empty = 20 - bar_filled
    bar = "[green]" + "█" * bar_filled + "[/green]" + "[dim]" + "░" * bar_empty + "[/dim]"
    lines.append(f"  Confidence: {bar} {conf_pct}%")

    # Reasoning
    lines.append(f"  [italic]{rec.reasoning}[/italic]")

    return "\n".join(lines)


def render_recommendations(resp: ApiResponse) -> str:
    """Render full recommendation response."""
    lines = []

    if resp.conversational_intro:
        lines.append(f"[bold green]Present Agent:[/bold green] {resp.conversational_intro}")
        lines.append("")

    for rec in resp.recommendations:
        lines.append(render_product_card(rec))
        lines.append("")

    if resp.conversational_outro:
        lines.append(f"[dim italic]{resp.conversational_outro}[/dim italic]")
        lines.append("")

    # Performance summary
    if resp.total_time_ms:
        secs = resp.total_time_ms / 1000
        lines.append(f"[dim]⏱ Total: {secs:.1f}s[/dim]", )
        if resp.agent_timings:
            top_agents = sorted(resp.agent_timings.items(), key=lambda x: x[1], reverse=True)[:5]
            timing_parts = [f"{name}: {ms/1000:.1f}s" for name, ms in top_agents]
            lines.append(f"[dim]  Agents: {' | '.join(timing_parts)}[/dim]")

    # Quality scorecard summary
    if resp.quality_scorecard:
        scores = []
        for dim, data in resp.quality_scorecard.items():
            if isinstance(data, dict) and "score" in data:
                score = data["score"]
                color = "green" if score >= 80 else "yellow" if score >= 60 else "red"
                scores.append(f"[{color}]{dim}: {score}[/{color}]")
        if scores:
            lines.append(f"[dim]Quality: {' | '.join(scores)}[/dim]")

    # Hint for new conversation
    lines.append("")
    lines.append("[dim]Type another query to start a new conversation | F2-F6 select product | Ctrl+Y copy | Ctrl+O open URL[/dim]")

    return "\n".join(lines)


def render_error(error_msg: str) -> str:
    """Render an error message."""
    return f"[bold red]Error:[/bold red] {error_msg}"


def render_thinking() -> str:
    """Render a thinking indicator."""
    return "[bold green]Present Agent:[/bold green] [dim italic]Thinking...[/dim italic]"


# ---------------------------------------------------------------------------
# Chat message widget
# ---------------------------------------------------------------------------

class ChatMessage(Static):
    """A single message in the chat history."""

    def __init__(self, content: str, msg_type: str = "assistant", **kwargs):
        super().__init__(content, **kwargs)
        self.msg_type = msg_type

    DEFAULT_CSS = """
    ChatMessage {
        padding: 0 2;
        margin: 0 0 1 0;
        width: 100%;
    }
    """


class ThinkingIndicator(Static):
    """Animated thinking indicator."""

    DEFAULT_CSS = """
    ThinkingIndicator {
        padding: 0 2;
        margin: 0 0 1 0;
        width: 100%;
        color: $text-muted;
    }
    """


# ---------------------------------------------------------------------------
# Starter prompts — randomized each session for varied testing
# ---------------------------------------------------------------------------

STARTER_PROMPTS = [
    # Specific + high context (should skip clarification)
    "My dad is turning 60 and loves coffee, budget around $50-80",
    "Birthday gift for my wife who's really into yoga and wellness, $60-120",
    "My teenage nephew is obsessed with skateboarding, budget $30-50",
    "Thank-you gift for my boss who likes whiskey, $50-100",
    "Anniversary gift for my husband who loves cooking, under $150",
    "Graduation gift for my 22-year-old sister who loves reading, $40-70",
    "Christmas gift for my mom who's into gardening, budget $30-60",
    "Housewarming gift for a couple who loves wine, around $50",
    "Gift for my best friend who just got into running, $40-80",
    "Retirement gift for my mentor who loves jazz music, $75-150",
    # Moderate context (may or may not clarify)
    "Something for a friend who's really into photography",
    "Gift for my brother who has everything, budget $100",
    "My girlfriend loves art, looking for something unique under $80",
    "Need a gift for a coworker who's into hiking and the outdoors",
    "Something special for my grandma who loves tea",
    "Gift for a new mom, budget $40-60",
    "My partner loves board games and D&D",
    "Looking for something for a 13-year-old who likes gaming",
    "Gift for my fitness-obsessed friend, around $50",
    "Something for a music lover who plays guitar, under $100",
    # Vague (should trigger clarifying questions)
    "I need a gift for someone",
    "Help me find a birthday present",
    "Looking for a gift idea",
    "I need to buy a present but I'm stuck",
    "What's a good gift?",
    # Edge cases / interesting scenarios
    "Last-minute gift for a dinner party tonight, under $30",
    "Long-distance relationship gift for my partner, $50-100",
    "Gift for someone who's really hard to shop for",
    "Eco-friendly gift for an environmentally conscious friend, $40-80",
    "Luxury gift for my parents' 30th wedding anniversary, $200+",
    "Something handmade or artisanal for a craft-loving aunt, $30-60",
    "Gift for a tech-savvy teen who loves building things, $50-100",
    "Self-care package for a stressed-out friend, under $60",
    "Gift for a foodie couple, budget $60-100",
    "Something meaningful for a friend going through a tough time",
    "Baby shower gift, budget $40-70",
    "Valentine's gift for someone I just started dating, $30-50",
    "Teacher appreciation gift, under $25",
    "Gift for a camping and outdoors enthusiast, $50-100",
    "Something for a dog lover, budget $30-50",
]


def pick_starters(n: int = 4) -> List[str]:
    """Pick n random non-repeating starter prompts."""
    return random.sample(STARTER_PROMPTS, min(n, len(STARTER_PROMPTS)))


# ---------------------------------------------------------------------------
# Starter prompt button
# ---------------------------------------------------------------------------

class StarterButton(Button):
    """A clickable starter prompt that sends the query directly."""

    class Clicked(Message):
        def __init__(self, prompt_text: str):
            super().__init__()
            self.prompt_text = prompt_text

    def __init__(self, prompt_text: str, **kwargs):
        # Truncate display if too long, but keep full text
        display = prompt_text if len(prompt_text) <= 60 else prompt_text[:57] + "..."
        super().__init__(display, variant="default", **kwargs)
        self.prompt_text = prompt_text

    DEFAULT_CSS = """
    StarterButton {
        margin: 0 1 1 0;
        min-width: 20;
        max-width: 70;
        height: 3;
    }
    """

    def on_click(self) -> None:
        self.post_message(self.Clicked(self.prompt_text))


# ---------------------------------------------------------------------------
# Suggested answer button
# ---------------------------------------------------------------------------

class AnswerButton(Button):
    """A suggested answer button for clarifying questions."""

    class Picked(Message):
        def __init__(self, question_id: str, answer: SuggestedAnswer):
            super().__init__()
            self.question_id = question_id
            self.answer = answer

    def __init__(self, question_id: str, answer: SuggestedAnswer, index: int, **kwargs):
        desc_suffix = f" — {answer.description}" if answer.description else ""
        label = f"{answer.label}{desc_suffix}"
        super().__init__(label, variant="default", **kwargs)
        self.question_id = question_id
        self.answer = answer

    DEFAULT_CSS = """
    AnswerButton {
        margin: 0 1 0 0;
        min-width: 12;
        height: 3;
    }
    """

    def on_click(self) -> None:
        self.post_message(self.Picked(self.question_id, self.answer))


class InlineAnswerRow(Horizontal):
    """A row of answer buttons for a specific question, mounted inline in chat."""

    DEFAULT_CSS = """
    InlineAnswerRow {
        height: auto;
        padding: 0 2 0 4;
        layout: horizontal;
        overflow: hidden auto;
    }
    """

    def __init__(self, question_id: str, **kwargs):
        super().__init__(**kwargs)
        self.question_id = question_id


# ---------------------------------------------------------------------------
# Product detail panel
# ---------------------------------------------------------------------------

class ProductDetailPanel(Static):
    """Expandable product detail view."""

    _current_idx: int = 0

    DEFAULT_CSS = """
    ProductDetailPanel {
        padding: 1 2;
        margin: 0 0 1 0;
        border: solid $accent;
        height: auto;
        display: none;
    }
    ProductDetailPanel.visible {
        display: block;
    }
    """

    def show_product(self, rec: ProductRec) -> None:
        lines = []
        lines.append(f"[bold]{rec.title}[/bold]")
        lines.append("")
        if rec.description:
            desc = rec.description[:500]
            if len(rec.description) > 500:
                desc += "..."
            lines.append(f"[dim]{desc}[/dim]")
            lines.append("")
        lines.append(f"[bold]Price:[/bold] ${rec.price:.2f} {rec.currency}")
        lines.append(f"[bold]Brand:[/bold] {rec.vendor}")
        if rec.product_url:
            lines.append(f"[bold]URL:[/bold] [link={rec.product_url}]{rec.product_url}[/link]")
        lines.append(f"[bold]Confidence:[/bold] {rec.confidence:.0%}")
        if rec.tags:
            lines.append(f"[bold]Tags:[/bold] {', '.join(rec.tags)}")
        lines.append("")
        lines.append(f"[bold]Why this gift:[/bold]")
        lines.append(f"[italic]{rec.reasoning}[/italic]")
        self.update("\n".join(lines))
        self.add_class("visible")

    def hide(self) -> None:
        self.remove_class("visible")


# ---------------------------------------------------------------------------
# Main App
# ---------------------------------------------------------------------------

class ChatApp(App):
    """Present Agent Chat TUI."""

    TITLE = "Present Agent Chat"
    SUB_TITLE = "Gift Recommendation Assistant"

    CSS = """
    Screen {
        layout: vertical;
    }

    #chat_scroll {
        height: 1fr;
        min-height: 10;
        padding: 1 0;
        border-bottom: solid $surface-darken-2;
    }

    #product_detail {
        max-height: 12;
        margin: 0 2;
    }

    #input_area {
        height: auto;
        max-height: 5;
        padding: 1 2;
    }

    #chat_input {
        width: 1fr;
    }

    #status_bar {
        height: 1;
        background: $surface;
        color: $text-muted;
        padding: 0 2;
    }

    #answer_bar {
        height: auto;
        max-height: 6;
        padding: 0 2;
        display: none;
    }
    #answer_bar.visible {
        display: block;
    }

    .answer-row {
        height: auto;
        padding: 0 0 0 2;
    }

    #starter_bar {
        height: auto;
        max-height: 10;
        padding: 0 2;
        display: none;
    }
    #starter_bar.visible {
        display: block;
    }

    .starter-row {
        height: auto;
        layout: horizontal;
        overflow: hidden;
    }
    """

    BINDINGS = [
        Binding("ctrl+q", "quit", "Quit", show=True),
        Binding("ctrl+n", "clear_chat", "New Chat", show=True),
        Binding("ctrl+k", "skip_questions", "Skip Qs", show=True),
        Binding("f1", "toggle_detail", "Details", show=True),
        Binding("ctrl+o", "open_product_url", "Open URL", show=True),
        Binding("ctrl+y", "copy_last_response", "Copy", show=True),
        Binding("escape", "focus_input", "Input", show=False),
    ]

    # State
    session_id: reactive[str] = reactive("")
    conversation_turn: reactive[int] = reactive(0)
    is_waiting: reactive[bool] = reactive(False)
    last_response: Optional[ApiResponse] = None
    original_query: str = ""
    pending_clarifications: Dict[str, Any] = {}
    current_questions: List[ClarifyingQuestion] = []

    def compose(self) -> ComposeResult:
        yield Header()
        yield VerticalScroll(id="chat_scroll")
        yield ProductDetailPanel(id="product_detail")
        yield Vertical(id="answer_bar")
        yield Vertical(id="starter_bar")
        yield Horizontal(
            Input(placeholder="Describe who you're shopping for...", id="chat_input"),
            id="input_area",
        )
        yield Static("Ready | Type a gift query to begin", id="status_bar")
        yield Footer()

    def on_mount(self) -> None:
        self._new_session()
        welcome = (
            "[bold green]Present Agent:[/bold green] Welcome! I help find thoughtful gifts.\n\n"
            "Tell me about who you're shopping for — or click a prompt below to get started.\n\n"
            "[dim]Keys: Ctrl+N new chat | Ctrl+K skip questions | Ctrl+Y copy | "
            "Ctrl+O open URL | F1 details | F2-F6 select product | Ctrl+Q quit[/dim]"
        )
        self._add_message(welcome, "assistant")
        self._show_starters()
        self.query_one("#chat_input", Input).focus()

    def _new_session(self) -> None:
        """Start a fresh conversation session."""
        self.session_id = f"tui-{uuid.uuid4().hex[:12]}"
        self.conversation_turn = 0
        self.last_response = None
        self.original_query = ""
        self.pending_clarifications = {}
        self.current_questions = []

    def _add_message(self, content: str, msg_type: str = "assistant") -> None:
        """Add a message to the chat scroll."""
        scroll = self.query_one("#chat_scroll", VerticalScroll)
        msg = ChatMessage(content, msg_type=msg_type)
        scroll.mount(msg)
        scroll.scroll_end(animate=False)

    def _remove_thinking(self) -> None:
        """Remove any thinking indicators."""
        for indicator in self.query("ThinkingIndicator"):
            indicator.remove()

    def _show_thinking(self) -> None:
        """Show a thinking indicator."""
        scroll = self.query_one("#chat_scroll", VerticalScroll)
        indicator = ThinkingIndicator(render_thinking())
        scroll.mount(indicator)
        scroll.scroll_end(animate=False)

    def _update_status(self, text: str) -> None:
        self.query_one("#status_bar", Static).update(text)

    def _show_inline_questions(self, resp: ApiResponse) -> None:
        """Mount clarifying questions with clickable answer buttons inline in chat."""
        scroll = self.query_one("#chat_scroll", VerticalScroll)

        # Intro text
        self._add_message(render_clarifying_intro(resp), "assistant")

        # Each question: label + button row
        for q in resp.questions:
            # Question text
            q_msg = ChatMessage(f"  [bold yellow]{q.question}[/bold yellow]", msg_type="question")
            scroll.mount(q_msg)

            if q.suggested_answers:
                row = InlineAnswerRow(question_id=q.id, id=f"answers_{q.id}")
                scroll.mount(row)
                for idx, sa in enumerate(q.suggested_answers[:6]):
                    btn = AnswerButton(q.id, sa, idx + 1)
                    row.mount(btn)

        # Hint text
        hint = ChatMessage(render_clarifying_hint(resp), msg_type="hint")
        scroll.mount(hint)
        scroll.scroll_end(animate=False)

        self.current_questions = resp.questions

    def _remove_answer_row(self, question_id: str) -> None:
        """Remove the button row for a specific question after it's answered."""
        try:
            row = self.query_one(f"#answers_{question_id}", InlineAnswerRow)
            row.remove()
        except Exception:
            pass

    def _remove_all_answer_rows(self) -> None:
        """Remove all inline answer rows from chat."""
        for row in self.query("InlineAnswerRow"):
            row.remove()
        self.current_questions = []

    def _hide_answer_buttons(self) -> None:
        """Remove all inline answer rows and clear the answer bar."""
        self._remove_all_answer_rows()
        bar = self.query_one("#answer_bar", Vertical)
        bar.remove_children()
        bar.remove_class("visible")

    def _show_starters(self) -> None:
        """Show randomized starter prompt buttons."""
        bar = self.query_one("#starter_bar", Vertical)
        bar.remove_children()
        prompts = pick_starters(4)
        row1 = Horizontal(classes="starter-row")
        row2 = Horizontal(classes="starter-row")
        bar.mount(row1)
        bar.mount(row2)
        for i, prompt in enumerate(prompts):
            btn = StarterButton(prompt)
            if i < 2:
                row1.mount(btn)
            else:
                row2.mount(btn)
        bar.add_class("visible")

    def _hide_starters(self) -> None:
        bar = self.query_one("#starter_bar", Vertical)
        bar.remove_children()
        bar.remove_class("visible")

    def on_starter_button_clicked(self, event: StarterButton.Clicked) -> None:
        """Handle starter prompt click — send it as a new query."""
        self._hide_starters()
        text = event.prompt_text
        self._add_message(render_user_message(text), "user")
        self._new_session()
        self.original_query = text
        self._send_query(text)

    # -----------------------------------------------------------------------
    # Input handling
    # -----------------------------------------------------------------------

    def on_input_submitted(self, event: Input.Submitted) -> None:
        if event.input.id != "chat_input":
            return

        text = event.value.strip()
        if not text:
            return

        event.input.value = ""

        if text.lower() == "skip":
            self.action_skip_questions()
            return

        if text.lower() in ("clear", "new", "/new"):
            self.action_clear_chat()
            return

        if text.lower() in ("/quit", "/exit"):
            self.exit()
            return

        # Show user message
        self._add_message(render_user_message(text), "user")
        self._hide_answer_buttons()
        self._hide_starters()

        # Determine if this is a clarification answer or new query
        if self.last_response and self.last_response.mode == "clarifying":
            self._send_clarification(text)
        else:
            # New conversation
            self._new_session()
            self.original_query = text
            self._send_query(text)

    def on_answer_button_picked(self, event: AnswerButton.Picked) -> None:
        """Handle suggested answer button click."""
        # Show as user message
        self._add_message(render_user_message(event.answer.label), "user")

        # Remove that question's button row (answered)
        self._remove_answer_row(event.question_id)

        # Store the clarification
        self.pending_clarifications[event.question_id] = event.answer.value

        # Check if all questions answered
        unanswered = [
            q for q in self.current_questions
            if q.id not in self.pending_clarifications
        ]
        if unanswered:
            # Scroll to next unanswered row
            self._update_status(
                f"Answered {event.question_id} | {len(unanswered)} remaining — "
                f"click an answer or type yours"
            )
            scroll = self.query_one("#chat_scroll", VerticalScroll)
            scroll.scroll_end(animate=False)
            return

        # All answered — remove remaining rows and send
        self._remove_all_answer_rows()
        self._send_with_clarifications()

    def _send_query(self, query: str) -> None:
        """Send a new query to the API."""
        self.is_waiting = True
        self._show_thinking()
        self._update_status(f"Session: {self.session_id[:16]}... | Sending query...")
        self._call_api(query=query)

    def _send_clarification(self, text: str) -> None:
        """Send clarification answer as natural language."""
        self.is_waiting = True
        self._show_thinking()
        self._update_status(f"Session: {self.session_id[:16]}... | Sending clarification...")

        # Build clarifications from the text and any button picks
        clarifications = dict(self.pending_clarifications)

        self._call_api(
            query=text,
            clarifications=clarifications if clarifications else None,
            original_query=self.original_query,
        )

    def _send_with_clarifications(self) -> None:
        """Send accumulated button-picked clarifications."""
        self.is_waiting = True
        self._show_thinking()
        self._update_status(f"Session: {self.session_id[:16]}... | Getting recommendations...")

        # Build a summary query from clarification labels
        parts = []
        for q in self.current_questions:
            val = self.pending_clarifications.get(q.id)
            if val is not None:
                if isinstance(val, dict):
                    parts.append(json.dumps(val))
                else:
                    parts.append(str(val))

        query = ", ".join(parts) if parts else self.original_query

        self._call_api(
            query=query,
            clarifications=self.pending_clarifications,
            original_query=self.original_query,
        )

    @work(thread=True)
    def _call_api(
        self,
        query: str,
        clarifications: Optional[Dict] = None,
        original_query: Optional[str] = None,
        skip_questions: bool = False,
    ) -> None:
        """Background API call."""
        try:
            resp = call_recommend(
                query=query,
                session_id=self.session_id,
                clarifications=clarifications,
                original_query=original_query,
                skip_questions=skip_questions,
            )
            self.call_from_thread(self._handle_response, resp)
        except HTTPError as e:
            body = ""
            try:
                body = e.read().decode("utf-8", errors="replace")[:500]
            except Exception:
                pass
            self.call_from_thread(
                self._handle_error,
                f"HTTP {e.code}: {e.reason}\n{body}"
            )
        except URLError as e:
            self.call_from_thread(
                self._handle_error,
                f"Cannot connect to API at {API_BASE}: {e.reason}\n"
                "Make sure the backend is running (cd src && npm run dev)"
            )
        except Exception as e:
            self.call_from_thread(self._handle_error, str(e))

    def _handle_response(self, resp: ApiResponse) -> None:
        """Process API response on the main thread."""
        self._remove_thinking()
        self.is_waiting = False
        self.last_response = resp
        self.conversation_turn += 1
        self.pending_clarifications = {}

        if resp.session_id:
            self.session_id = resp.session_id

        if resp.mode == "no_results":
            # Render no-results message with suggestions
            lines = []
            lines.append(f"[bold green]Present Agent:[/bold green] {resp.no_results_message}")
            if resp.no_results_suggestions:
                lines.append("")
                lines.append("[bold yellow]Try:[/bold yellow]")
                for suggestion in resp.no_results_suggestions:
                    lines.append(f"  [dim]•[/dim] {suggestion}")
            lines.append("")
            lines.append("[dim]Type a new query or refine your request.[/dim]")
            self._add_message("\n".join(lines), "assistant")
            self._update_status(
                f"Session: {self.session_id[:16]}... | Turn {self.conversation_turn} | "
                f"No results | {resp.total_time_ms/1000:.1f}s"
            )
        elif resp.mode == "clarifying":
            self._show_inline_questions(resp)
            self._update_status(
                f"Session: {self.session_id[:16]}... | Turn {self.conversation_turn} | "
                f"Clarifying ({len(resp.questions)} questions) | "
                f"{resp.total_time_ms/1000:.1f}s"
            )
        elif resp.mode in ("recommendations", "recommendations_with_refinement"):
            content = render_recommendations(resp)
            self._add_message(content, "assistant")

            if resp.questions:  # hybrid mode refinement questions — inline
                scroll = self.query_one("#chat_scroll", VerticalScroll)
                self._add_message(
                    "[bold green]Present Agent:[/bold green] Want to refine these results?",
                    "assistant",
                )
                for q in resp.questions:
                    q_msg = ChatMessage(f"  [bold yellow]{q.question}[/bold yellow]", msg_type="question")
                    scroll.mount(q_msg)
                    if q.suggested_answers:
                        row = InlineAnswerRow(question_id=q.id, id=f"answers_{q.id}")
                        scroll.mount(row)
                        for idx, sa in enumerate(q.suggested_answers[:6]):
                            btn = AnswerButton(q.id, sa, idx + 1)
                            row.mount(btn)
                scroll.scroll_end(animate=False)
                self.current_questions = resp.questions

            # Quality summary in status
            scorecard_summary = ""
            if resp.quality_scorecard:
                scores = []
                for dim, data in resp.quality_scorecard.items():
                    if isinstance(data, dict) and "score" in data:
                        scores.append(f"{dim[:3]}:{data['score']}")
                scorecard_summary = f" | Q: {' '.join(scores)}"

            self._update_status(
                f"Session: {self.session_id[:16]}... | Turn {self.conversation_turn} | "
                f"{len(resp.recommendations)} recs | "
                f"{resp.total_time_ms/1000:.1f}s{scorecard_summary}"
            )
        else:
            self._add_message(render_assistant_text("Received an unexpected response."), "assistant")
            self._update_status(f"Unknown mode: {resp.mode}")

        self.query_one("#chat_input", Input).focus()

    def _handle_error(self, error_msg: str) -> None:
        """Handle API errors."""
        self._remove_thinking()
        self.is_waiting = False
        self._add_message(render_error(error_msg), "error")
        self._update_status("Error — try again or type 'new' for a fresh session")
        self.query_one("#chat_input", Input).focus()

    # -----------------------------------------------------------------------
    # Actions
    # -----------------------------------------------------------------------

    def action_quit(self) -> None:
        self.exit()

    def action_clear_chat(self) -> None:
        """Clear chat and start new session."""
        scroll = self.query_one("#chat_scroll", VerticalScroll)
        scroll.remove_children()
        self._hide_answer_buttons()
        self._hide_starters()
        self.query_one("#product_detail", ProductDetailPanel).hide()
        self._new_session()
        self._update_status("Ready | New session started")
        self._add_message(
            "[bold green]Present Agent:[/bold green] New conversation started. "
            "Pick a prompt or type your own!",
            "assistant",
        )
        self._show_starters()
        self.query_one("#chat_input", Input).focus()

    def action_skip_questions(self) -> None:
        """Skip clarifying questions and go straight to recommendations."""
        if not self.last_response or self.last_response.mode != "clarifying":
            return
        if self.is_waiting:
            return

        self._add_message(render_user_message("[Skip questions — show recommendations]"), "user")
        self._hide_answer_buttons()

        self.is_waiting = True
        self._show_thinking()
        self._update_status(f"Session: {self.session_id[:16]}... | Skipping to recommendations...")

        self._call_api(
            query=self.original_query,
            skip_questions=True,
        )

    def action_focus_input(self) -> None:
        self.query_one("#chat_input", Input).focus()

    def action_toggle_detail(self) -> None:
        """Toggle product detail panel visibility."""
        panel = self.query_one("#product_detail", ProductDetailPanel)
        if panel.has_class("visible"):
            panel.hide()
        elif self.last_response and self.last_response.recommendations:
            panel._current_idx = 0
            panel.show_product(self.last_response.recommendations[0])

    def action_open_product_url(self) -> None:
        """Open the first (or selected) product URL in the browser."""
        if not self.last_response or not self.last_response.recommendations:
            self._update_status("No product to open")
            return
        # Open the detail-panel product if visible, else first rec
        panel = self.query_one("#product_detail", ProductDetailPanel)
        idx = getattr(panel, "_current_idx", 0)
        if idx < len(self.last_response.recommendations):
            rec = self.last_response.recommendations[idx]
        else:
            rec = self.last_response.recommendations[0]
        if rec.product_url:
            import webbrowser
            webbrowser.open(rec.product_url)
            self._update_status(f"Opened: {rec.product_url[:60]}...")
        else:
            self._update_status("No URL available for this product")

    def action_copy_last_response(self) -> None:
        """Copy last assistant response text to clipboard."""
        if not self.last_response:
            self._update_status("Nothing to copy")
            return
        try:
            import subprocess
            if self.last_response.mode in ("recommendations", "recommendations_with_refinement"):
                lines = []
                if self.last_response.conversational_intro:
                    lines.append(self.last_response.conversational_intro)
                    lines.append("")
                for rec in self.last_response.recommendations:
                    lines.append(f"#{rec.rank} {rec.title} — ${rec.price:.2f}")
                    lines.append(f"   {rec.vendor}")
                    lines.append(f"   {rec.reasoning}")
                    if rec.product_url:
                        lines.append(f"   {rec.product_url}")
                    lines.append("")
                text = "\n".join(lines)
            elif self.last_response.mode == "clarifying":
                text = self.last_response.natural_language or "Clarifying questions"
            else:
                text = "No content"
            proc = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE)
            proc.communicate(text.encode("utf-8"))
            self._update_status("Copied to clipboard!")
        except Exception as e:
            self._update_status(f"Copy failed: {e}")

    def _select_product(self, idx: int) -> None:
        """Show product detail by index (0-based)."""
        if (
            self.last_response
            and self.last_response.recommendations
            and idx < len(self.last_response.recommendations)
        ):
            rec = self.last_response.recommendations[idx]
            panel = self.query_one("#product_detail", ProductDetailPanel)
            panel._current_idx = idx
            panel.show_product(rec)

    def on_key(self, event) -> None:
        """Handle product selection via Alt+number (don't steal plain number keys)."""
        # Alt+1 through Alt+5 to select products (won't interfere with typing)
        key = event.key
        if key in ("ctrl+1", "ctrl+2", "ctrl+3", "ctrl+4", "ctrl+5"):
            # Some terminals send ctrl+number
            idx = int(key[-1]) - 1
            self._select_product(idx)
            event.prevent_default()
        # F2-F6 as alternative product selectors (universally safe)
        elif key in ("f2", "f3", "f4", "f5", "f6"):
            idx = int(key[1]) - 2  # f2=0, f3=1, ...
            self._select_product(idx)
            event.prevent_default()


# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------

def main():
    app = ChatApp()
    app.run()


if __name__ == "__main__":
    main()
