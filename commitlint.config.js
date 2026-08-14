module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => /^Bumps \[.+]\(.+\) from .+ to .+\./m.test(message)],
  rules: {
    // config-conventional caps body and footer lines at 100 characters. A commit body is
    // prose explaining a change, and hard-wrapping it buys nothing a reader benefits from:
    // git and every review tool wrap for display anyway, while the limit rejects a single
    // long sentence or a pasted URL. The subject limit is left in place, since a short
    // subject is what makes `git log --oneline` readable.
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
