import re
import unittest

from docutils import nodes


REFERENCE_RE = re.compile(r'^((([^\/]+)/)?([^#]+))?#(\d+)$')
URL_TEMPLATE = 'https://github.com/{owner}/{repo}/issues/{issueno}'


# https://docutils.readthedocs.io/en/sphinx-docs/howto/rst-roles.html
def github_issue(name, rawtext, text, lineno, inliner,
                 options=None, content=None):
    try:
        url = parse_text(text)
    except ValueError:
        message = "Could not parse a reference to GitHub issue: '{}'".format(text)
        error = inliner.reporter.error(message, line=lineno)
        problematic = inliner.problematic(rawtext, rawtext, error)
        return [problematic], [error]

    node = nodes.reference(rawtext, text, refuri=url, **(options or {}))
    return [node], []


def parse_text(text):
    match = REFERENCE_RE.match(text)
    if match:
        explicit_owner = match.group(3)
        explicit_repo = match.group(4)
        issueno = match.group(5) or None

        # '#123' refers to this repo (the fork); 'repo#123' refers to an
        # apiaryio sibling repo (api-blueprint, dredd-transactions, etc.);
        # 'owner/repo#123' refers to an arbitrary repo.
        if explicit_owner:
            owner, repo = explicit_owner, explicit_repo
        elif explicit_repo:
            owner, repo = 'apiaryio', explicit_repo
        else:
            owner, repo = 'antimatter-studios', 'dredd'

        if issueno:
            return URL_TEMPLATE.format(owner=owner, repo=repo, issueno=issueno)

    raise ValueError(text)


def setup(app):
    app.add_role('ghissue', github_issue)
    return {'version': '1.0', 'parallel_read_safe': True}


class Tests(unittest.TestCase):
    def test_owner_repo_issueno(self):
        self.assertEqual(
            parse_text('refractproject/minim#83'),
            'https://github.com/refractproject/minim/issues/83'
        )

    def test_repo_issueno(self):
        self.assertEqual(
            parse_text('dredd-transactions#163'),
            'https://github.com/apiaryio/dredd-transactions/issues/163'
        )

    def test_issueno(self):
        self.assertEqual(
            parse_text('#1119'),
            'https://github.com/antimatter-studios/dredd/issues/1119'
        )

    def test_syntax_error(self):
        with self.assertRaises(ValueError):
            parse_text('42')


if __name__ == '__main__':
    unittest.main()
