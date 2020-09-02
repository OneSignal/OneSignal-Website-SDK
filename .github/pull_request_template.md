# Description
## 1 Line Summary

## Details

# Systems Affected
   - [ ] WebSDK
   - [ ] Backend
   - [ ] Dashboard

# Validation
## Tests
### Info

### Checklist
   - [ ] All the automated tests pass or I explained why that is not possible
   - [ ] I have personally tested this on my machine or explained why that is not possible
   - [ ] I have included test coverage for these changes or explained why they are not needed

**Programming Checklist**
Interfaces:
   - [ ] Don't use default export
   - [ ] New interfaces are in model files

Functions:
   - [ ] Don't use default export
   - [ ] All function signatures have return types
   - [ ] Helpers should not access any data but rather be given the data to operate on.

Typescript:
   - [ ] No Typescript warnings
   - [ ] Avoid silencing null/undefined warnings with the exclamation point

Other:
   - [ ] Iteration: refrain from using `elem of array` syntax. Prefer `forEach` or use `map`
   - [ ] Avoid using global OneSignal accessor for `context` if possible. Instead, we can pass it to function/constructor so that we don't call `OneSignal.context`

## Screenshots
### Info

### Checklist
   - [ ] I have included screenshots/recordings of the intended results or explained why they are not needed

---

## Related Tickets

---
