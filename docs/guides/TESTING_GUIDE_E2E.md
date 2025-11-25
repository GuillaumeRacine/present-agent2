# End-to-End Testing Guide (E2E)

**Frontend Integration - Conversational UX**

---

## ✅ Development Servers Running

- **Backend**: http://localhost:3000 (healthy)
- **Frontend**: http://localhost:3001
- **Status**: Both servers ready for testing

---

## Test Scenarios

### Test 1: Vague Query → Clarifying Questions → Recommendations

**Goal**: Verify that vague queries trigger conversational questions

**Steps**:
1. Open http://localhost:3001 in your browser
2. Log in with magic link (check your email)
3. Type: `gift for dad`
4. Press Enter

**Expected Behavior**:
- ✅ Backend should return `mode: 'clarifying'`
- ✅ Frontend should display ClarifyingQuestions component with:
  - Natural language intro (warm acknowledgment)
  - Numbered questions (1, 2, 3...)
  - Suggested answer buttons for each question
  - Encouragement message at bottom
  - "Skip questions, show me options →" button

**Verify**:
- [ ] Questions display with natural language
- [ ] Clicking answer buttons highlights them (variant changes)
- [ ] Progress indicator shows "X of Y answered"
- [ ] "Continue" button is disabled until at least one answer
- [ ] "Continue" button enables when answers provided

---

### Test 2: Answer Questions → Submit → Get Recommendations

**Goal**: Verify answer submission and recommendation flow

**Steps**:
1. From Test 1, click answer buttons for each question:
   - Budget: Click "$50-100"
   - Interests: Click "Coffee" or "Reading"
   - Occasion: Click "Birthday"
2. Click "Continue" button

**Expected Behavior**:
- ✅ POST request sent to `/api/chat` with `clarifications` object
- ✅ Backend processes answers and returns `mode: 'recommendations'`
- ✅ Frontend displays ProductCard components with:
  - Natural language intro
  - Ranked recommendations (1, 2, 3...)
  - Reasoning for each product
  - Confidence scores

**Verify**:
- [ ] Loading indicator appears during request
- [ ] User message shows "My answers: budget: {...}, interests: [...]"
- [ ] Assistant message shows recommendations
- [ ] Products are relevant to answers given
- [ ] Confidence scores are higher than vague query (≥60%)

---

### Test 3: Escape Hatch → Skip Questions → Fallback Recommendations

**Goal**: Verify escape hatch functionality for impatient users

**Steps**:
1. Type: `hello`
2. Press Enter
3. Wait for questions to appear
4. Click "Skip questions, show me options →" button

**Expected Behavior**:
- ✅ User message shows "Skip questions, show me options"
- ✅ POST request sent with `skipQuestions: true`
- ✅ Backend returns `mode: 'recommendations'` with best-effort results
- ✅ Frontend displays ProductCard components (may have lower confidence)

**Verify**:
- [ ] Escape hatch button is visible
- [ ] Clicking skip proceeds to recommendations
- [ ] No error messages appear
- [ ] Recommendations are shown (even if lower quality)

---

### Test 4: Detailed Query → Direct Recommendations (No Questions)

**Goal**: Verify that detailed queries skip questions

**Steps**:
1. Start new chat (click "New Chat" button)
2. Type: `Looking for a $50-100 gift for my coffee-loving mom for her birthday next week`
3. Press Enter

**Expected Behavior**:
- ✅ Backend detects high confidence (≥0.7) and critical fields (≥3)
- ✅ DialogueManager returns `mode: 'recommend'` (skip questions)
- ✅ Orchestrator proceeds directly to recommendations
- ✅ Frontend displays ProductCard components immediately
- ✅ No questions asked - smooth experience

**Verify**:
- [ ] No ClarifyingQuestions component appears
- [ ] Recommendations show immediately
- [ ] Products are relevant to coffee + birthday + $50-100
- [ ] Confidence scores are high (≥70%)

---

### Test 5: Multi-Turn Conversation

**Goal**: Verify conversation history is maintained

**Steps**:
1. Type: `gift for mom`
2. Answer questions: Budget=$50-100, Interests=Coffee
3. Click "Continue"
4. After recommendations, type: `show me cheaper options`

**Expected Behavior**:
- ✅ Backend maintains session context
- ✅ Previous answers (mom, coffee, birthday) are remembered
- ✅ New recommendations adjust budget lower
- ✅ Recipient and interests stay the same

**Verify**:
- [ ] Context is maintained across turns
- [ ] Budget adjusts without re-asking recipient
- [ ] Recommendations reflect budget change

---

## Visual Validation

### ClarifyingQuestions Component

Open browser DevTools (F12) and verify:

**Typography**:
- [ ] Introduction text is readable (prose formatting)
- [ ] Question text is bold (font-medium)
- [ ] Help text is smaller and muted (text-sm text-muted-foreground)

**Layout**:
- [ ] Questions are in cards with padding
- [ ] Numbered badges appear on left (1, 2, 3...)
- [ ] Answer buttons wrap properly on narrow screens
- [ ] Escape hatch has visual separator (horizontal line)

**Interactions**:
- [ ] Selected answers have primary variant (blue background)
- [ ] Unselected answers have outline variant (border only)
- [ ] Hover states work on all buttons
- [ ] Disabled state shows when loading

**Responsive**:
- [ ] Works on mobile (< 640px width)
- [ ] Works on tablet (640-1024px width)
- [ ] Works on desktop (> 1024px width)

---

## Performance Validation

### Timing Benchmarks

Open browser DevTools → Network tab and measure:

**Frontend**:
- [ ] Component render: < 50ms
- [ ] Answer click response: < 16ms (instant)
- [ ] Page load: < 2 seconds

**Backend** (check response times in Network tab):
- [ ] DialoguePresenter: < 100ms
- [ ] Total API response: < 500ms
- [ ] Acceptable: < 1 second

**Full Round Trip** (user click → recommendations visible):
- [ ] Target: < 2 seconds
- [ ] Acceptable: < 3 seconds

---

## Error Handling Validation

### Test Error Scenarios

**Network Error**:
1. Disconnect internet
2. Try to submit answers
3. Verify: Error message appears, doesn't crash

**Backend Error**:
1. Kill backend server (Ctrl+C in backend terminal)
2. Try to submit query
3. Verify: "Failed to get recommendations" error shows

**Invalid Response**:
1. Check that malformed backend responses don't crash frontend
2. Verify: Graceful degradation

---

## Browser Console Checks

Open DevTools → Console and verify:

**No Errors**:
- [ ] No React warnings
- [ ] No TypeScript errors
- [ ] No network errors (except intentional)

**Expected Logs**:
- [ ] API requests logged (if debug mode)
- [ ] User interactions tracked (if analytics)

---

## Mobile Testing (Optional)

Test on actual mobile device or Chrome DevTools mobile emulator:

**iPhone 13 Pro (390x844)**:
- [ ] Questions display correctly
- [ ] Buttons are tappable (not too small)
- [ ] Text is readable (no horizontal scroll)

**iPad (768x1024)**:
- [ ] Layout adjusts for tablet
- [ ] Two-column layout if applicable

---

## Accessibility Checks (Optional)

Use Lighthouse or axe DevTools:

- [ ] Keyboard navigation works (Tab through questions)
- [ ] Screen reader announces questions properly
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators visible

---

## Data Flow Verification

### Backend Logs

Check terminal running `npm run server:dev`:

**Listener Agent**:
- [ ] Extracts: recipient, interests, budget, occasion
- [ ] Confidence score calculated

**DialogueManager**:
- [ ] Decision logged (ask/recommend/hybrid)
- [ ] Reasoning shown
- [ ] Critical fields count displayed

**DialoguePresenter** (if questions):
- [ ] Natural language intro generated
- [ ] Questions framed conversationally
- [ ] Contextual help added

**Explorer** (if recommendations):
- [ ] Cypher queries executed
- [ ] Products retrieved from Neo4j
- [ ] Hybrid search (70% graph + 30% vector)

### Frontend State

Use React DevTools to inspect:

**ChatPage Component**:
- [ ] `messages` array updates correctly
- [ ] `questionAnswers` tracks user selections
- [ ] `isAnsweringQuestions` flag toggles
- [ ] `isLoading` shows during requests

---

## Success Criteria

### Minimum Viable (Must Pass)
- [x] Servers start successfully
- [ ] Vague query triggers questions
- [ ] Answer buttons work and submit correctly
- [ ] Recommendations display after answers
- [ ] Escape hatch skips to recommendations
- [ ] No console errors

### Full Success (Should Pass)
- [ ] Detailed query skips questions
- [ ] Natural language is warm and conversational
- [ ] Progress indicator updates correctly
- [ ] Performance under 2 seconds round trip
- [ ] Mobile responsive

### Exceptional (Nice to Have)
- [ ] All personas validated
- [ ] Accessibility checks pass
- [ ] Performance under 1 second
- [ ] Multi-turn conversation works perfectly

---

## Test Results Template

Copy this template and fill in results:

```markdown
## Test Results - [Your Name] - [Date]

### Environment
- Browser: Chrome 120 / Safari 17 / Firefox 121
- Device: MacBook Pro / iPhone 13 / iPad
- Network: WiFi / 4G / 3G

### Test 1: Vague Query → Questions
- Status: PASS / FAIL
- Notes:

### Test 2: Answer → Recommendations
- Status: PASS / FAIL
- Notes:

### Test 3: Escape Hatch
- Status: PASS / FAIL
- Notes:

### Test 4: Detailed Query → Direct
- Status: PASS / FAIL
- Notes:

### Test 5: Multi-Turn
- Status: PASS / FAIL
- Notes:

### Performance
- Average round trip: [X]ms
- Component render: [X]ms
- Backend response: [X]ms

### Issues Found
1. [Description]
2. [Description]

### Overall Assessment
- Ready for production: YES / NO / WITH FIXES
- Confidence level: HIGH / MEDIUM / LOW
- Recommended next steps: [...]
```

---

## Debugging Tips

### Questions Don't Appear

**Symptoms**: Vague query shows recommendations instead of questions

**Check**:
1. Backend logs: DialogueManager decision
2. Confidence score: Should be < 0.7 for questions
3. Critical fields: Should be < 3
4. Response mode: Should be `'clarifying'`

**Fix**: Adjust confidence thresholds in DialogueManager

---

### Answers Not Submitting

**Symptoms**: Clicking "Continue" does nothing

**Check**:
1. Console errors
2. `questionAnswers` state in React DevTools
3. Network tab: Is request sent?
4. Request payload: Are `clarifications` included?

**Fix**: Verify `handleSubmitAnswers()` is wired correctly

---

### Escape Hatch Not Working

**Symptoms**: Skip button missing or not functional

**Check**:
1. `showEscapeHatch` prop in message
2. `onSkip` handler passed to component
3. Backend flag: `showEscapeHatch: true` in response

**Fix**: Verify orchestrator returns `showEscapeHatch` field

---

### Styling Issues

**Symptoms**: Component looks broken or unstyled

**Check**:
1. Tailwind CSS loaded (frontend build)
2. Component imports correct UI components
3. Browser console for CSS errors

**Fix**: Rebuild frontend: `cd frontend && npm run build`

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Mark testing todo as complete
2. Move to persona validation
3. Consider A/B testing setup
4. Plan production deployment

### If Tests Fail ❌
1. Document failures in test results
2. Create GitHub issues for bugs
3. Prioritize fixes (critical → nice-to-have)
4. Re-run tests after fixes

### If Performance Issues ⚠️
1. Profile with Chrome DevTools
2. Check backend agent timings
3. Optimize slow components
4. Consider caching strategies

---

## Quick Test Commands

```bash
# Start both servers
npm run dev  # From root (if available)

# Or separately:
npm run server:dev  # Backend (Terminal 1)
cd frontend && npm run dev  # Frontend (Terminal 2)

# Check backend health
curl http://localhost:3000/health

# Check frontend
curl http://localhost:3001

# View backend logs
tail -f logs/combined.log

# Build frontend
cd frontend && npm run build
```

---

## Contact / Support

**Issues?** Check:
1. This guide first
2. `FRONTEND_INTEGRATION_COMPLETE.md` for implementation details
3. `PRIORITY_1_UX_IMPROVEMENTS_IMPLEMENTATION.md` for backend details
4. `docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md` for original requirements

**Still stuck?** Document:
- Steps to reproduce
- Expected vs actual behavior
- Console errors
- Network request/response
- Browser and OS version

---

**Happy Testing!** 🎉

The conversational UX improvement is a significant enhancement. Take your time testing each scenario thoroughly to ensure a smooth user experience.
