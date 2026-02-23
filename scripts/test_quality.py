#!/usr/bin/env python3
"""
End-to-end quality test — simulates full user experience including question flow.

Saves complete test trail to data/quality_tests/ with timestamped runs.
Each run captures: inputs, full API responses, recommendations with reasoning,
Bar Raiser scores, agent timings, and a human/LLM-readable markdown report.

Usage:
    python3 scripts/test_quality.py                # Run all personas
    python3 scripts/test_quality.py --persona dad  # Run one persona (substring match)
    python3 scripts/test_quality.py --list         # List available personas
"""

import json
import os
import sys
import time
from datetime import datetime

API_URL = "http://localhost:3001/api/recommend"

# ============================================================
# Test Personas
# ============================================================
PERSONAS = [
    {
        "id": "vague-gift",
        "name": "Vague Query (should trigger questions)",
        "description": "Tests clarification flow: minimal info forces Turn 1 questions, Turn 2 answers.",
        "query": "I need a gift for someone",
        "expected": {
            "should_clarify": True,
            "min_bar_raiser": 60,
        },
        "answers": {
            "budget": {"min": 40, "max": 80},
            "occasion": {"name": "birthday"},
            "relationship": "friend",
            "interests": ["cooking", "travel"],
            "recipientAge": "30s",
            "recipientGender": "female",
        },
        "followup_text": "It's for my friend Sarah's birthday. She's in her 30s and loves cooking and traveling. Budget around $40-80.",
    },
    {
        "id": "dad-coffee",
        "name": "Birthday for Coffee-Loving Dad",
        "description": "Tests interest precision: should return coffee + outdoor products, not tea/furniture.",
        "query": "I need a birthday gift for my dad. He loves coffee and is pretty outdoorsy. Budget around $50-80.",
        "expected": {
            "should_clarify": False,
            "min_bar_raiser": 60,
            "interests": ["coffee", "outdoors"],
            "budget": {"min": 50, "max": 80},
            "avoid_keywords": ["tea", "yoga", "jewelry"],
        },
        "answers": {},
        "followup_text": "",
    },
    {
        "id": "wife-yoga",
        "name": "Anniversary for Yoga Wife",
        "description": "Tests wellness category + budget respect ($120 cap) + anniversary occasion context.",
        "query": "Looking for an anniversary gift for my wife. She's really into yoga and wellness, loves natural and organic products. Can spend up to $120.",
        "expected": {
            "should_clarify": False,
            "min_bar_raiser": 60,
            "interests": ["yoga", "wellness"],
            "budget": {"min": 50, "max": 120},
        },
        "answers": {},
        "followup_text": "",
    },
    {
        "id": "nephew-teen",
        "name": "Christmas for Teen Nephew",
        "description": "Tests teen/niche interests (skateboarding, music) + age-appropriate recs for 16yo male.",
        "query": "Christmas gift for my 16 year old nephew. He's into skateboarding and music. Budget $30-50.",
        "expected": {
            "should_clarify": False,
            "min_bar_raiser": 60,
            "interests": ["skateboarding", "music"],
            "budget": {"min": 30, "max": 50},
            "avoid_keywords": ["jewelry", "earring", "necklace", "bracelet"],
        },
        "answers": {},
        "followup_text": "",
    },
    {
        "id": "boss-thankyou",
        "name": "Thank You for Boss",
        "description": "Tests occasion (thank you) + relationship (boss) context. Should be tasteful/professional.",
        "query": "Thank you gift for my boss who helped me get a promotion. She likes tea and reading. Something tasteful and professional, around $60.",
        "expected": {
            "should_clarify": False,
            "min_bar_raiser": 60,
            "interests": ["tea", "reading"],
            "budget": {"min": 40, "max": 75},
        },
        "answers": {},
        "followup_text": "",
    },
]


# ============================================================
# API Client
# ============================================================
def call_api(query, user_id, session_id, clarifications=None, original_query=None):
    import urllib.request

    payload = {
        "userQuery": query,
        "userId": user_id,
        "sessionId": session_id,
    }
    if clarifications:
        payload["clarifications"] = clarifications
    if original_query:
        payload["originalQuery"] = original_query

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(API_URL, data=data, headers={"Content-Type": "application/json"})

    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            result = json.loads(resp.read().decode('utf-8'))
        result['_wall_time'] = time.time() - start
        result['_request'] = payload
        return result
    except Exception as e:
        return {"error": str(e), "_wall_time": time.time() - start, "_request": payload}


# ============================================================
# Data Extraction Helpers
# ============================================================
def extract_questions(data):
    questions = data.get('questions', [])
    refinement = data.get('refinementQuestions', [])
    return questions + refinement


def extract_recommendations(data):
    recs_data = data.get('recommendations', {})
    if isinstance(recs_data, dict):
        return recs_data.get('recommendations', [])
    elif isinstance(recs_data, list):
        return recs_data
    return []


def extract_bar_raiser(data):
    et = data.get('executionTrace', {})
    br = et.get('barRaiser', {})
    return {
        "score": br.get('overallScore') or br.get('score'),
        "dimensions": br.get('dimensions', br.get('dimensionScores', {})),
        "feedback": br.get('feedback', br.get('qualitativeFeedback', '')),
        "raw": br,
    }


def extract_agent_timings(data):
    perf = data.get('performance', {})
    et = data.get('executionTrace', {})
    timings = {}
    for key in ['listener', 'memory', 'relationship', 'constraints', 'meaning',
                'explorer', 'validator', 'storyteller', 'presenter', 'barRaiser',
                'dialoguePresenter', 'dialogueManager']:
        if key in et and isinstance(et[key], dict):
            t = et[key].get('executionTimeMs', et[key].get('timing'))
            if t is not None:
                timings[key] = t
    # Also check performance.agentTimings
    agent_timings = perf.get('agentTimings', {})
    if agent_timings:
        timings.update(agent_timings)
    timings['total_ms'] = perf.get('totalExecutionTimeMs', 0)
    return timings


def extract_full_recommendation(r):
    """Extract complete recommendation data for logging."""
    prod = r.get('product', r)
    return {
        "title": prod.get('title', r.get('title', '?')),
        "price": prod.get('price', r.get('price', '?')),
        "currency": prod.get('currency', r.get('currency', 'USD')),
        "brand_url": prod.get('vendor', r.get('vendor', r.get('brandUrl', '?'))),
        "product_url": prod.get('url', prod.get('productUrl', r.get('productUrl', prod.get('product_url', prod.get('id', ''))))),
        "confidence": r.get('confidence', '?'),
        "tags": r.get('tags', []),
        "reasoning": r.get('reasoning', r.get('whyThisGift', '')),
        "interest_matches": r.get('interestMatches', r.get('matchedInterests', [])),
        "occasion_match": r.get('occasionMatch', ''),
        "relationship_match": r.get('relationshipMatch', ''),
        "attributes": {k: v for k, v in prod.items() if k.startswith('is_') and v},
    }


def clean_vendor(vendor):
    if isinstance(vendor, str) and vendor.startswith('http'):
        return vendor.replace('https://', '').replace('http://', '').replace('www.', '').rstrip('/')
    return vendor or '?'


# ============================================================
# Evaluation Helpers
# ============================================================
def evaluate_persona(persona, result):
    """Compare results against expected outcomes."""
    checks = []
    expected = persona.get('expected', {})
    recs_data = result.get('recommendations', {})
    recs = recs_data.get('items', [])
    bar_raiser = recs_data.get('bar_raiser', {})
    turns = result.get('turns', [])

    # Check: Did it clarify when expected?
    if 'should_clarify' in expected:
        modes = [t.get('mode') for t in turns]
        did_clarify = 'clarifying' in modes
        passed = did_clarify == expected['should_clarify']
        checks.append({
            "check": "clarification_flow",
            "expected": expected['should_clarify'],
            "actual": did_clarify,
            "passed": passed,
        })

    # Check: Bar Raiser score
    score = bar_raiser.get('score')
    if score is not None and 'min_bar_raiser' in expected:
        passed = score >= expected['min_bar_raiser']
        checks.append({
            "check": "bar_raiser_score",
            "expected": f">= {expected['min_bar_raiser']}",
            "actual": score,
            "passed": passed,
        })

    # Check: Budget respect
    if 'budget' in expected and recs:
        prices = [r.get('price', 0) for r in recs if isinstance(r.get('price'), (int, float))]
        if prices:
            budget = expected['budget']
            out_of_range = [p for p in prices if p < budget.get('min', 0) * 0.7 or p > budget.get('max', 9999) * 1.3]
            passed = len(out_of_range) <= 1  # Allow 1 outlier
            checks.append({
                "check": "budget_respect",
                "expected": f"${budget.get('min')}-${budget.get('max')} (with 30% tolerance)",
                "actual": f"prices: {[f'${p:.0f}' for p in prices]}",
                "out_of_range": len(out_of_range),
                "passed": passed,
            })

    # Check: Avoid keywords in titles
    if 'avoid_keywords' in expected and recs:
        titles = ' '.join(r.get('title', '').lower() for r in recs)
        found = [kw for kw in expected['avoid_keywords'] if kw.lower() in titles]
        passed = len(found) == 0
        checks.append({
            "check": "avoid_keywords",
            "expected": f"no: {expected['avoid_keywords']}",
            "actual": f"found: {found}" if found else "none found (good)",
            "passed": passed,
        })

    # Check: "unknown shopper" leakage
    if recs:
        reasonings = ' '.join(r.get('reasoning', '').lower() for r in recs)
        has_leakage = 'unknown shopper' in reasonings or 'as an unknown' in reasonings
        checks.append({
            "check": "giver_reference_leakage",
            "expected": "no 'unknown shopper' in reasoning",
            "actual": "LEAKAGE DETECTED" if has_leakage else "clean",
            "passed": not has_leakage,
        })

    # Check: Product URLs present (conversion-critical)
    if recs:
        urls = [r.get('product_url', '') for r in recs]
        valid_urls = [u for u in urls if u and u.startswith('http')]
        all_have_urls = len(valid_urls) == len(recs)
        checks.append({
            "check": "product_urls",
            "expected": f"all {len(recs)} recs have valid URLs",
            "actual": f"{len(valid_urls)}/{len(recs)} have URLs",
            "passed": all_have_urls,
        })

    return checks


# ============================================================
# Run a Single Persona
# ============================================================
def run_persona(persona, persona_num, total):
    pid = persona['id']
    session = f"test-{pid}-{int(time.time())}"
    user = f"test-{pid}"

    print(f"\n{'━' * 70}")
    print(f"  PERSONA {persona_num}/{total}: {persona['name']}")
    print(f"{'━' * 70}")
    print(f"  Query: \"{persona['query']}\"")

    result = {
        "persona_id": pid,
        "persona_name": persona['name'],
        "persona_description": persona['description'],
        "session_id": session,
        "initial_query": persona['query'],
        "expected": persona.get('expected', {}),
        "turns": [],
        "recommendations": {},
        "evaluation": [],
    }

    # ── Turn 1 ──
    print(f"\n  [Turn 1] Sending initial query...")
    data1 = call_api(persona['query'], user, session)

    if 'error' in data1:
        print(f"  ERROR: {data1['error']}")
        result['error'] = data1['error']
        result['turns'].append({"turn": 1, "error": data1['error'], "raw_response": data1})
        return result

    mode1 = data1.get('mode', 'unknown')
    exec_time1 = data1.get('performance', {}).get('totalExecutionTimeMs', 0)
    wall_time1 = data1.get('_wall_time', 0)
    print(f"  Response mode: {mode1} ({exec_time1/1000:.1f}s server, {wall_time1:.1f}s wall)")

    turn1 = {
        "turn": 1,
        "mode": mode1,
        "exec_time_ms": exec_time1,
        "wall_time_s": round(wall_time1, 2),
        "agent_timings": extract_agent_timings(data1),
        "questions": [],
        "raw_response": data1,
    }

    # Capture questions
    questions = extract_questions(data1)
    if questions:
        print(f"\n  Questions asked ({len(questions)}):")
        for q in questions:
            qtext = q.get('question', '')[:100]
            qid = q.get('id', q.get('field', '?'))
            answers = q.get('suggestedAnswers', [])
            answer_labels = [a.get('label', '?') for a in answers[:4]]
            print(f"    [{qid}] {qtext}")
            print(f"          Options: {', '.join(answer_labels)}")
        turn1['questions'] = questions  # Full question objects

    result['turns'].append(turn1)

    # Capture Turn 1 recs if present
    recs1 = extract_recommendations(data1)
    if recs1:
        _capture_recs(recs1, data1, result)

    # ── Turn 2: If clarifying ──
    if mode1 == 'clarifying' and persona.get('followup_text'):
        print(f"\n  [Turn 2] Answering questions...")
        print(f"  Answer: \"{persona['followup_text'][:100]}\"")

        data2 = call_api(
            persona['followup_text'], user, session,
            clarifications=persona.get('answers'),
            original_query=persona['query'],
        )

        if 'error' in data2:
            print(f"  ERROR: {data2['error']}")
            result['error'] = data2['error']
            result['turns'].append({"turn": 2, "error": data2['error'], "raw_response": data2})
            return result

        mode2 = data2.get('mode', 'unknown')
        exec_time2 = data2.get('performance', {}).get('totalExecutionTimeMs', 0)
        wall_time2 = data2.get('_wall_time', 0)
        print(f"  Response mode: {mode2} ({exec_time2/1000:.1f}s server, {wall_time2:.1f}s wall)")

        turn2 = {
            "turn": 2,
            "mode": mode2,
            "input_text": persona['followup_text'],
            "clarifications_sent": persona.get('answers'),
            "exec_time_ms": exec_time2,
            "wall_time_s": round(wall_time2, 2),
            "agent_timings": extract_agent_timings(data2),
            "raw_response": data2,
        }
        result['turns'].append(turn2)

        recs2 = extract_recommendations(data2)
        if recs2:
            _capture_recs(recs2, data2, result)

    elif mode1 == 'recommendations_with_refinement':
        ref_qs = data1.get('refinementQuestions', [])
        if ref_qs:
            result['refinement_questions'] = ref_qs

    # ── Evaluation ──
    result['evaluation'] = evaluate_persona(persona, result)

    # Print summary
    bar_raiser = result['recommendations'].get('bar_raiser', {})
    score = bar_raiser.get('score')
    if score is not None:
        print(f"\n  Bar Raiser Score: {score}/100")
    checks = result['evaluation']
    passed = sum(1 for c in checks if c.get('passed'))
    total_checks = len(checks)
    print(f"  Evaluation: {passed}/{total_checks} checks passed")
    for c in checks:
        icon = "PASS" if c['passed'] else "FAIL"
        print(f"    [{icon}] {c['check']}: {c.get('actual', '')}")

    return result


def _capture_recs(recs, data, result):
    """Extract and display full recommendation data."""
    recs_data = data.get('recommendations', {})
    intro = ''
    outro = ''
    if isinstance(recs_data, dict):
        intro = recs_data.get('conversationalIntro', '')
        outro = recs_data.get('conversationalOutro', '')

    if intro:
        print(f"\n  Intro: \"{intro[:200]}\"")

    print(f"\n  Recommendations ({len(recs)}):")
    full_recs = []
    for i, r in enumerate(recs):
        fr = extract_full_recommendation(r)
        full_recs.append(fr)
        vendor = clean_vendor(fr['brand_url'])
        print(f"    {i+1}. {fr['title']} (${fr['price']}) — {vendor}")
        conf_val = fr['confidence']
        conf_str = conf_val if isinstance(conf_val, str) else f"{conf_val:.2f}"
        tag_str = ', '.join(fr['tags'][:5])
        print(f"       Confidence: {conf_str} | Tags: {tag_str}")
        if fr['reasoning']:
            print(f"       Why: {str(fr['reasoning'])[:160]}")

    bar_raiser = extract_bar_raiser(data)

    prices = []
    brands = set()
    for fr in full_recs:
        try:
            prices.append(float(fr['price']))
        except (ValueError, TypeError):
            pass
        brands.add(clean_vendor(fr['brand_url']).lower())

    result['recommendations'] = {
        "count": len(full_recs),
        "items": full_recs,
        "intro": intro,
        "outro": outro,
        "prices": prices,
        "price_avg": round(sum(prices) / len(prices), 2) if prices else 0,
        "price_min": min(prices) if prices else 0,
        "price_max": max(prices) if prices else 0,
        "unique_brands": sorted(brands),
        "brand_count": len(brands),
        "bar_raiser": bar_raiser,
    }

    # Display Bar Raiser
    if bar_raiser.get('score'):
        qs = data.get('qualityScorecard', {})
        if qs:
            print(f"  Quality Scorecard: {json.dumps(qs)[:200]}")


# ============================================================
# Report Generation
# ============================================================
def generate_markdown_report(results, run_meta):
    """Generate a human/LLM-readable markdown report."""
    lines = []
    ts = run_meta['timestamp']
    lines.append(f"# Quality Test Run: {ts}")
    lines.append("")
    lines.append(f"**Date:** {run_meta['date_human']}")
    lines.append(f"**Version:** {run_meta.get('version', 'unknown')}")
    lines.append(f"**Personas:** {len(results)}")
    lines.append(f"**API:** {API_URL}")
    lines.append("")

    # Summary table
    lines.append("## Summary")
    lines.append("")
    lines.append("| Persona | Bar Raiser | Checks | Brands | Avg Price | Time | Issues |")
    lines.append("|---------|-----------|--------|--------|-----------|------|--------|")

    scores = []
    for r in results:
        recs = r.get('recommendations', {})
        br = recs.get('bar_raiser', {})
        score = br.get('score', '-')
        if isinstance(score, (int, float)):
            scores.append(score)
        checks = r.get('evaluation', [])
        passed = sum(1 for c in checks if c.get('passed'))
        total_checks = len(checks)
        brands = recs.get('brand_count', 0)
        avg_price = recs.get('price_avg', 0)
        total_time = sum(t.get('exec_time_ms', 0) for t in r.get('turns', []))
        failures = [c['check'] for c in checks if not c.get('passed')]
        issues = ', '.join(failures) if failures else '-'

        lines.append(f"| {r['persona_name']} | {score}/100 | {passed}/{total_checks} | {brands} | ${avg_price:.0f} | {total_time/1000:.0f}s | {issues} |")

    avg_score = sum(scores) / len(scores) if scores else 0
    lines.append(f"| **Average** | **{avg_score:.0f}/100** | | | | | |")
    lines.append("")

    target = 60
    if avg_score >= target:
        lines.append(f"> **PASS** -- Average Bar Raiser score {avg_score:.0f}/100 meets target of {target}/100")
    else:
        lines.append(f"> **FAIL** -- Average Bar Raiser score {avg_score:.0f}/100 below target of {target}/100")
    lines.append("")

    # Per-persona details
    lines.append("---")
    lines.append("")
    lines.append("## Per-Persona Details")

    for r in results:
        lines.append("")
        lines.append(f"### {r['persona_name']}")
        lines.append("")
        lines.append(f"**Description:** {r.get('persona_description', '')}")
        lines.append(f"**Query:** \"{r['initial_query']}\"")
        lines.append(f"**Session:** `{r.get('session_id', '')}`")
        lines.append("")

        # Turns
        for t in r.get('turns', []):
            turn_num = t.get('turn', '?')
            mode = t.get('mode', '?')
            exec_ms = t.get('exec_time_ms', 0)
            wall_s = t.get('wall_time_s', 0)
            lines.append(f"**Turn {turn_num}:** mode=`{mode}` | server={exec_ms/1000:.1f}s | wall={wall_s:.1f}s")

            # Questions
            qs = t.get('questions', [])
            if qs:
                lines.append("")
                lines.append("Questions asked:")
                for q in qs:
                    if isinstance(q, dict):
                        qtext = q.get('question', '')
                        qid = q.get('id', q.get('field', ''))
                        answers = q.get('suggestedAnswers', [])
                        labels = [a.get('label', '') for a in answers[:4]]
                        lines.append(f"- **[{qid}]** {qtext}")
                        if labels:
                            lines.append(f"  - Options: {', '.join(labels)}")
                    else:
                        lines.append(f"- {q}")

            # Clarification input
            if t.get('input_text'):
                lines.append(f"\nAnswer sent: \"{t['input_text']}\"")

            # Agent timings
            timings = t.get('agent_timings', {})
            if timings and timings.get('total_ms'):
                lines.append("")
                lines.append("Agent timings (ms):")
                lines.append("```")
                for agent, ms in sorted(timings.items()):
                    if agent != 'total_ms' and isinstance(ms, (int, float)) and ms > 0:
                        lines.append(f"  {agent:25s} {ms:>7.0f}ms")
                lines.append(f"  {'TOTAL':25s} {timings.get('total_ms', 0):>7.0f}ms")
                lines.append("```")

            lines.append("")

        # Recommendations
        recs = r.get('recommendations', {})
        items = recs.get('items', [])
        if items:
            intro = recs.get('intro', '')
            if intro:
                lines.append(f"**Intro:** \"{intro[:300]}\"")
                lines.append("")

            lines.append(f"**Recommendations ({len(items)}):**")
            lines.append("")
            lines.append("| # | Product | Price | Brand | Confidence | Tags |")
            lines.append("|---|---------|-------|-------|------------|------|")
            for i, item in enumerate(items):
                vendor = clean_vendor(item.get('brand_url', ''))
                conf = item.get('confidence', '?')
                conf_str = f"{conf:.2f}" if isinstance(conf, float) else str(conf)
                tags = ', '.join(item.get('tags', [])[:4])
                product_url = item.get('product_url', '')
                title_display = f"[{item['title']}]({product_url})" if product_url else item['title']
                lines.append(f"| {i+1} | {title_display} | ${item['price']} | {vendor} | {conf_str} | {tags} |")

            lines.append("")

            # Full reasoning for each
            lines.append("**Reasoning:**")
            lines.append("")
            for i, item in enumerate(items):
                reasoning = item.get('reasoning', '')
                if reasoning:
                    lines.append(f"{i+1}. **{item['title']}**: {reasoning}")
                    lines.append("")

        # Bar Raiser
        br = recs.get('bar_raiser', {})
        if br.get('score'):
            lines.append(f"**Bar Raiser Score: {br['score']}/100**")
            lines.append("")
            dims = br.get('dimensions', {})
            if dims:
                lines.append("Dimension scores:")
                lines.append("")
                for dim, val in dims.items():
                    if isinstance(val, dict):
                        dscore = val.get('score', '?')
                        dreason = val.get('reasoning', '')[:120]
                        lines.append(f"- **{dim}**: {dscore}/100 -- {dreason}")
                    elif isinstance(val, (int, float)):
                        lines.append(f"- **{dim}**: {val}/100")
                lines.append("")
            feedback = br.get('feedback', '')
            if feedback and isinstance(feedback, str):
                lines.append(f"Feedback: {feedback[:300]}")
            elif feedback and isinstance(feedback, list):
                lines.append(f"Feedback: {'; '.join(str(f) for f in feedback[:5])}")
                lines.append("")

        # Evaluation checks
        checks = r.get('evaluation', [])
        if checks:
            lines.append("**Evaluation Checks:**")
            lines.append("")
            for c in checks:
                icon = "PASS" if c['passed'] else "FAIL"
                lines.append(f"- [{icon}] **{c['check']}**: expected={c.get('expected', '')} | actual={c.get('actual', '')}")
            lines.append("")

        # Error
        if r.get('error'):
            lines.append(f"**ERROR:** {r['error']}")
            lines.append("")

        lines.append("---")

    return '\n'.join(lines)


# ============================================================
# Main
# ============================================================
def main():
    # Parse args
    persona_filter = None
    if '--persona' in sys.argv:
        idx = sys.argv.index('--persona')
        if idx + 1 < len(sys.argv):
            persona_filter = sys.argv[idx + 1].lower()
    if '--list' in sys.argv:
        print("Available personas:")
        for p in PERSONAS:
            print(f"  {p['id']:20s} {p['name']}")
        return

    # Filter personas
    personas = PERSONAS
    if persona_filter:
        personas = [p for p in PERSONAS if persona_filter in p['id'].lower() or persona_filter in p['name'].lower()]
        if not personas:
            print(f"No persona matching '{persona_filter}'. Use --list to see available.")
            return

    # Run meta
    now = datetime.now()
    run_id = now.strftime("%Y%m%d_%H%M%S")
    run_meta = {
        "run_id": run_id,
        "timestamp": now.isoformat(),
        "date_human": now.strftime("%B %d, %Y at %I:%M %p"),
        "version": "3.2.0",
        "api_url": API_URL,
        "persona_count": len(personas),
        "persona_ids": [p['id'] for p in personas],
    }

    print("=" * 70)
    print("  PRESENT AGENT2 — QUALITY TEST")
    print(f"  Run: {run_id} | Personas: {len(personas)}")
    print("=" * 70)

    results = []
    for i, persona in enumerate(personas):
        result = run_persona(persona, i + 1, len(personas))
        results.append(result)

    # ── Console Summary ──
    print(f"\n\n{'=' * 70}")
    print("  QUALITY SUMMARY")
    print(f"{'=' * 70}")

    scores = []
    for r in results:
        recs = r.get('recommendations', {})
        br = recs.get('bar_raiser', {})
        score = br.get('score')
        turns = r.get('turns', [])
        total_time = sum(t.get('exec_time_ms', 0) for t in turns)
        modes = [t.get('mode') for t in turns]
        checks = r.get('evaluation', [])
        passed = sum(1 for c in checks if c.get('passed'))

        print(f"\n  {r['persona_name']}:")
        print(f"    Turns: {len(turns)} | Modes: {' -> '.join(str(m) for m in modes)}")
        print(f"    Time: {total_time/1000:.1f}s | Bar Raiser: {score}/100 | Checks: {passed}/{len(checks)}")

        if recs.get('items'):
            print(f"    Recs: {recs.get('count', 0)} | Prices: ${recs.get('price_min', 0):.0f}-${recs.get('price_max', 0):.0f} (avg ${recs.get('price_avg', 0):.0f})")
            print(f"    Brands: {recs.get('brand_count', 0)} unique")
            titles = [item['title'] for item in recs['items'][:3]]
            print(f"    Products: {', '.join(titles)}...")

        failures = [c['check'] for c in checks if not c.get('passed')]
        if failures:
            print(f"    FAILURES: {', '.join(failures)}")

        if score is not None:
            scores.append(score)

        if r.get('error'):
            print(f"    ERROR: {r['error'][:80]}")

    # Overall
    if scores:
        avg = sum(scores) / len(scores)
        print(f"\n  {'─' * 50}")
        print(f"  OVERALL: Bar Raiser avg = {avg:.0f}/100 (target: >=60)")
        if avg >= 60:
            print(f"  RESULT: PASS")
        else:
            print(f"  RESULT: FAIL (delta: {60 - avg:.0f} points)")

    # ── Save Results ──
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(project_root, "data", "quality_tests")
    os.makedirs(output_dir, exist_ok=True)

    # Strip raw_response from JSON (too large) but keep everything else
    clean_results = []
    for r in results:
        cr = dict(r)
        cr['turns'] = []
        for t in r.get('turns', []):
            ct = {k: v for k, v in t.items() if k != 'raw_response'}
            cr['turns'].append(ct)
        clean_results.append(cr)

    # JSON (structured, for programmatic analysis)
    json_path = os.path.join(output_dir, f"run_{run_id}.json")
    full_output = {
        "meta": run_meta,
        "results": clean_results,
        "summary": {
            "bar_raiser_avg": round(sum(scores) / len(scores), 1) if scores else None,
            "bar_raiser_scores": {r['persona_id']: r.get('recommendations', {}).get('bar_raiser', {}).get('score') for r in results},
            "total_checks": sum(len(r.get('evaluation', [])) for r in results),
            "checks_passed": sum(sum(1 for c in r.get('evaluation', []) if c.get('passed')) for r in results),
            "avg_response_time_s": round(sum(sum(t.get('exec_time_ms', 0) for t in r.get('turns', [])) for r in results) / len(results) / 1000, 1) if results else 0,
        },
    }
    with open(json_path, "w") as f:
        json.dump(full_output, f, indent=2, default=str)

    # Markdown (human/LLM readable report)
    md_path = os.path.join(output_dir, f"run_{run_id}.md")
    md_content = generate_markdown_report(results, run_meta)
    with open(md_path, "w") as f:
        f.write(md_content)

    # Also save raw API responses separately (for deep debugging)
    raw_dir = os.path.join(output_dir, f"run_{run_id}_raw")
    os.makedirs(raw_dir, exist_ok=True)
    for r in results:
        for t in r.get('turns', []):
            raw = t.get('raw_response')
            if raw:
                turn_num = t.get('turn', 0)
                raw_path = os.path.join(raw_dir, f"{r['persona_id']}_turn{turn_num}.json")
                with open(raw_path, "w") as f:
                    json.dump(raw, f, indent=2, default=str)

    # Update latest symlink
    latest_json = os.path.join(output_dir, "latest.json")
    latest_md = os.path.join(output_dir, "latest.md")
    for link, target in [(latest_json, json_path), (latest_md, md_path)]:
        try:
            if os.path.islink(link):
                os.unlink(link)
            os.symlink(os.path.basename(target), link)
        except OSError:
            pass  # Windows or permission issue

    print(f"\n  Results saved:")
    print(f"    Report:  {md_path}")
    print(f"    Data:    {json_path}")
    print(f"    Raw API: {raw_dir}/")
    print(f"    Latest:  {latest_md}")

    # Also keep /tmp copy for quick access
    with open("/tmp/quality_test_results.json", "w") as f:
        json.dump(full_output, f, indent=2, default=str)


if __name__ == "__main__":
    main()
