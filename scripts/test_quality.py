#!/usr/bin/env python3
"""
End-to-end quality test — simulates full user experience including question flow.
"""

import json
import time
import urllib.request

API_URL = "http://localhost:3001/api/recommend"

# Each persona has an initial query + prepared answers for likely questions
PERSONAS = [
    {
        "id": "vague-gift",
        "name": "Vague Query (should trigger questions)",
        "query": "I need a gift for someone",
        "answers": {
            # Common question fields the system might ask
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
        "query": "I need a birthday gift for my dad. He loves coffee and is pretty outdoorsy. Budget around $50-80.",
        "answers": {},
        "followup_text": "",
    },
    {
        "id": "wife-yoga",
        "name": "Anniversary for Yoga Wife",
        "query": "Looking for an anniversary gift for my wife. She's really into yoga and wellness, loves natural and organic products. Can spend up to $120.",
        "answers": {},
        "followup_text": "",
    },
    {
        "id": "nephew-teen",
        "name": "Christmas for Teen Nephew",
        "query": "Christmas gift for my 16 year old nephew. He's into skateboarding and music. Budget $30-50.",
        "answers": {},
        "followup_text": "",
    },
    {
        "id": "boss-thankyou",
        "name": "Thank You for Boss",
        "query": "Thank you gift for my boss who helped me get a promotion. She likes tea and reading. Something tasteful and professional, around $60.",
        "answers": {},
        "followup_text": "",
    },
]


def call_api(query, user_id, session_id, clarifications=None, original_query=None):
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
        return result
    except Exception as e:
        return {"error": str(e), "_wall_time": time.time() - start}


def extract_questions(data):
    """Extract questions from response."""
    questions = data.get('questions', [])
    refinement = data.get('refinementQuestions', [])
    return questions + refinement


def extract_recommendations(data):
    """Extract recommendations from response, handling nested structures."""
    recs_data = data.get('recommendations', {})
    if isinstance(recs_data, dict):
        return recs_data.get('recommendations', [])
    elif isinstance(recs_data, list):
        return recs_data
    return []


def format_recommendation(r, idx):
    """Format a single recommendation for display."""
    prod = r.get('product', r)
    title = prod.get('title', r.get('title', '?'))
    price = prod.get('price', r.get('price', '?'))
    vendor = prod.get('vendor', r.get('vendor', r.get('brandUrl', '?')))
    # Clean vendor URL
    if isinstance(vendor, str) and vendor.startswith('http'):
        vendor = vendor.replace('https://', '').replace('http://', '').replace('www.', '').rstrip('/')
    reasoning = r.get('reasoning', r.get('whyThisGift', ''))
    conf = r.get('confidence', '?')
    tags = r.get('tags', [])

    lines = [f"    {idx}. {title} (${price}) — {vendor}"]
    lines.append(f"       Confidence: {conf if isinstance(conf, str) else f'{conf:.2f}'} | Tags: {', '.join(tags[:5])}")
    if reasoning:
        lines.append(f"       Why: {str(reasoning)[:160]}")
    return '\n'.join(lines)


def run_persona(persona, persona_num, total):
    """Run a full conversation for one persona."""
    pid = persona['id']
    session = f"test-{pid}-{int(time.time())}"
    user = f"test-{pid}"

    print(f"\n{'━' * 70}")
    print(f"  PERSONA {persona_num}/{total}: {persona['name']}")
    print(f"{'━' * 70}")
    print(f"  Query: \"{persona['query']}\"")

    result = {
        "persona": pid,
        "name": persona['name'],
        "turns": [],
    }

    # Turn 1: Initial query
    print(f"\n  [Turn 1] Sending initial query...")
    t1_start = time.time()
    data = call_api(persona['query'], user, session)
    t1_time = time.time() - t1_start

    if 'error' in data:
        print(f"  ERROR: {data['error']}")
        result['error'] = data['error']
        return result

    mode = data.get('mode', 'unknown')
    exec_time = data.get('performance', {}).get('totalExecutionTimeMs', 0)
    print(f"  Response mode: {mode} ({exec_time/1000:.1f}s server, {t1_time:.1f}s wall)")

    result['turns'].append({
        'turn': 1,
        'mode': mode,
        'exec_time_ms': exec_time,
        'wall_time_s': t1_time,
    })

    # Handle questions
    questions = extract_questions(data)
    if questions:
        print(f"\n  Questions asked ({len(questions)}):")
        for q in questions:
            qtext = q.get('question', '')[:100]
            qid = q.get('id', q.get('field', '?'))
            answers = q.get('suggestedAnswers', [])
            answer_labels = [a.get('label', '?') for a in answers[:4]]
            print(f"    [{qid}] {qtext}")
            print(f"          Options: {', '.join(answer_labels)}")

        result['turns'][-1]['questions'] = [q.get('question', '') for q in questions]

    # Show recommendations if present
    recs = extract_recommendations(data)
    if recs:
        show_recs(recs, data, result)

    # Turn 2: If questions were asked and we have answers, respond
    if mode == 'clarifying' and persona.get('followup_text'):
        print(f"\n  [Turn 2] Answering questions...")
        print(f"  Answer: \"{persona['followup_text'][:100]}\"")

        data2 = call_api(
            persona['followup_text'],
            user, session,
            clarifications=persona.get('answers'),
            original_query=persona['query'],
        )

        if 'error' in data2:
            print(f"  ERROR: {data2['error']}")
            result['error'] = data2['error']
            return result

        mode2 = data2.get('mode', 'unknown')
        exec_time2 = data2.get('performance', {}).get('totalExecutionTimeMs', 0)
        t2_time = data2.get('_wall_time', 0)
        print(f"  Response mode: {mode2} ({exec_time2/1000:.1f}s server, {t2_time:.1f}s wall)")

        result['turns'].append({
            'turn': 2,
            'mode': mode2,
            'exec_time_ms': exec_time2,
            'wall_time_s': t2_time,
        })

        recs2 = extract_recommendations(data2)
        if recs2:
            show_recs(recs2, data2, result)

    # Also handle refinement questions with follow-up if we already got recs
    elif mode == 'recommendations_with_refinement' and persona.get('followup_text'):
        ref_qs = data.get('refinementQuestions', [])
        if ref_qs:
            print(f"\n  [Refinement questions available but already got recs — skipping follow-up]")

    return result


def show_recs(recs, data, result):
    """Display and record recommendations."""
    # Intro
    recs_data = data.get('recommendations', {})
    if isinstance(recs_data, dict):
        intro = recs_data.get('conversationalIntro', '')
        if intro:
            print(f"\n  Intro: \"{intro[:200]}\"")

    print(f"\n  Recommendations ({len(recs)}):")
    for i, r in enumerate(recs):
        print(format_recommendation(r, i + 1))

    # Bar Raiser
    et = data.get('executionTrace', {})
    br = et.get('barRaiser', {})
    br_score = br.get('overallScore') or br.get('score')
    if br_score:
        print(f"\n  Bar Raiser Score: {br_score}/100")
        dims = br.get('dimensions', br.get('dimensionScores', {}))
        if dims:
            for k, v in dims.items():
                if isinstance(v, (int, float)):
                    print(f"    {k}: {v}")

    # Quality
    qs = data.get('qualityScorecard', {})
    if qs:
        print(f"  Quality Scorecard: {json.dumps(qs)[:200]}")

    # Refinement questions
    ref_qs = data.get('refinementQuestions', [])
    if ref_qs:
        print(f"\n  Refinement Questions:")
        for q in ref_qs:
            print(f"    - {q.get('question', '')[:100]}")

    # Record
    prices = []
    brands = set()
    for r in recs:
        prod = r.get('product', r)
        p = prod.get('price', r.get('price'))
        try:
            prices.append(float(p))
        except (ValueError, TypeError):
            pass
        v = prod.get('vendor', r.get('vendor', r.get('brandUrl', '')))
        if v:
            brands.add(str(v).lower().replace('https://', '').replace('http://', '').replace('www.', '').rstrip('/'))

    result['recommendations'] = {
        'count': len(recs),
        'prices': prices,
        'price_avg': round(sum(prices) / len(prices), 2) if prices else 0,
        'price_range': f"${min(prices):.0f}-${max(prices):.0f}" if prices else "?",
        'unique_brands': len(brands),
        'bar_raiser_score': br_score,
        'titles': [
            (r.get('product', r).get('title', r.get('title', '?')))
            for r in recs
        ],
    }


def main():
    print("=" * 70)
    print("  PRESENT AGENT2 — FULL USER EXPERIENCE QUALITY TEST")
    print("=" * 70)

    results = []
    for i, persona in enumerate(PERSONAS):
        result = run_persona(persona, i + 1, len(PERSONAS))
        results.append(result)

    # Summary
    print(f"\n\n{'=' * 70}")
    print("  QUALITY SUMMARY")
    print(f"{'=' * 70}")

    for r in results:
        recs = r.get('recommendations', {})
        turns = r.get('turns', [])
        total_time = sum(t.get('exec_time_ms', 0) for t in turns)
        modes = [t.get('mode') for t in turns]

        print(f"\n  {r['name']}:")
        print(f"    Turns: {len(turns)} | Modes: {' → '.join(modes)}")
        print(f"    Total time: {total_time/1000:.1f}s")

        if recs:
            print(f"    Recs: {recs.get('count', 0)} | Prices: {recs.get('price_range', '?')} (avg ${recs.get('price_avg', 0):.0f})")
            print(f"    Brands: {recs.get('unique_brands', 0)} unique")
            print(f"    Bar Raiser: {recs.get('bar_raiser_score', '?')}/100")
            if recs.get('titles'):
                print(f"    Products: {', '.join(recs['titles'][:3])}...")
        elif r.get('error'):
            print(f"    ERROR: {r['error'][:80]}")

    # Overall stats
    all_recs = [r.get('recommendations', {}) for r in results if r.get('recommendations')]
    if all_recs:
        avg_count = sum(r.get('count', 0) for r in all_recs) / len(all_recs)
        avg_br = sum(r.get('bar_raiser_score', 0) or 0 for r in all_recs) / len(all_recs)
        avg_brands = sum(r.get('unique_brands', 0) for r in all_recs) / len(all_recs)
        all_times = [sum(t.get('exec_time_ms', 0) for t in r.get('turns', [])) for r in results]
        avg_time = sum(all_times) / len(all_times)

        print(f"\n  {'─' * 50}")
        print(f"  OVERALL AVERAGES:")
        print(f"    Recs per query: {avg_count:.1f}")
        print(f"    Bar Raiser score: {avg_br:.0f}/100")
        print(f"    Brand diversity: {avg_brands:.1f}")
        print(f"    Avg response time: {avg_time/1000:.1f}s")

    # Save full results
    with open("/tmp/quality_test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\n  Full results: /tmp/quality_test_results.json")


if __name__ == "__main__":
    main()
