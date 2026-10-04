# Cr*nMaster

Cr*nMaster is a web UI for cron. It reads and writes the real crontabs of real users on a machine somebody owns, and it can run any of those jobs on demand. It runs natively, or in a container that reaches into the host to do the same thing. Either way, whoever can use it can run commands as any user on that host, root included.

Treat it like a root shell with a nice UI, because that is what it is.

There is no company behind this and no support desk. When a crontab gets mangled, a backup script stops running at 3am and nobody notices for a month. There is a person, their server, and whatever backup they happened to take.

The name has an asterisk in it. Cr*nMaster, `cr*nmaster` in log tags. It is not a typo, so don't fix it.

This file covers what we value. Branching and pull requests live in `CONTRIBUTING.md`, and the user-facing documentation lives in `howto/`.

## The crontab is the database

There is no database. The source of truth is the crontab itself, plus some metadata we tuck into the comment line above each job. People edit those files by hand, with `crontab -e`, with Ansible, with other tools. Our lines have to survive that, and their lines have to survive us.

A line we wrote two years ago has to parse today. People update when they remember, so the shape you are reading may come from a version that no longer exists. We keep reading old shapes forever. Changing how we write a line means every parser accepts both the old and the new form first, with tests built from real lines in the old format.

A job line that works today is written back byte for byte. Don't quote it, reformat it, normalise its whitespace or tidy it on the way through. I have been burned by this more than once. The current format has worked for a long time without complaints, and that is worth more than whatever your change makes prettier.

Read, change, write back. A write that fails halfway can leave somebody with an empty crontab, and an empty crontab looks exactly like a working one until the jobs don't run.

## Every setup is different

Cr*nMaster runs on NAS boxes, Raspberry Pis, LXC containers, VPSes, laptops and old towers under desks. Different distros, different cron daemons, service users with no login shell, paths with spaces, containers in a different timezone from the host, filesystems that don't record when a file was created, and drives that spin down to save power.

"It works on my machine" proves very little here. Before you rely on something about the host, ask what happens on the weirdest machine you can think of. Somebody runs it there.

New behaviour is opt-in. Defaults don't change under people's feet: no new required environment variables, no inputs rejected that used to work, no feature that starts touching disks it never touched before. If the secure or correct choice would break existing setups, add it behind an environment variable, document it, and tell me so it can become the default in a major release.

The disks thing is real. Some people run this on a NAS full of sleeping drives. Anything that polls, scans or stats the filesystem has to stay on what it was asked about, cache its answer, and leave everything else alone.

## Security

Every value that ends up in a shell command or a crontab line is hostile until proven otherwise. Usernames, job ids, schedules, comments, script names, log file names. Quote what goes into a shell, validate what goes into a crontab, and check containment on every path you build from something the browser sent. A newline in a comment is a new cron line. A `..` in a filename is somebody else's file.

Server actions are public endpoints, whatever the UI does with them. When auth is configured, every action checks it on the server, every time. Client-side checks exist so people don't click buttons that will refuse them, and that is all they do.

Running without auth is a choice people make on purpose, usually behind a VPN or on a home network. Respect it. Warn about it, document it, don't force a login on them. The API key protects the REST API and nothing else, and people who set it without a password get an orange warning at startup telling them so. That warning stays.

Secrets never reach the logs or the browser. Passwords, API keys, session ids, cookies, and the full contents of somebody's crontab. Error messages shown to the user say what went wrong, not what was in the file.

A mutation shipped without its auth check, or a shell string built from user input without quoting, is the first thing I look for in review.

## Running jobs

"Run now" and the scheduled run have to behave the same way, as the same user, with the same environment as close as we can get it. If a job works when the host's cron runs it and fails when somebody presses the button, people stop trusting both.

Job logs are written on the host by a small wrapper script, and they belong to the user. Cleanup follows the documented limits and nothing else. A log that disappears when somebody refreshes the page is a bug that makes people think their job never ran.

Never touch the real crontab of the machine you are working on. Not in tests, not to check something quickly, not to "just see if it works". Mock it, fake it, or spin up a throwaway container as the host and delete it afterwards. Don't install or purge packages on shared machines or VMs either. The crontab on this laptop runs my actual stuff.

## Translations

Anything a user reads goes through a translation key. Buttons, toasts, tooltips, errors, empty states. A hardcoded string is an English word in somebody's German interface. Every locale file has to carry the same keys as English, and the tests check it. Don't leave English placeholders in the other locales, translate them.

## The REST API

People call it from scripts, Home Assistant, n8n and shell aliases, and they never read the changelog. Adding a field is safe. Renaming one, dropping one, or changing what a status means breaks somebody's automation.

## How I like to work

Look before you build. What you need probably exists already, under a name you wouldn't have picked. Most requests are an environment variable, a check on an existing action, or a few lines next to a case that is already handled.

Fix causes. A guard that hides the error while the crontab on disk is still wrong is worse than the error.

Boy scout rule, within reason. Tidy the mess next to your change while you are in the file. Don't turn a bug fix into a rewrite of the crontab parser.

Pull requests go to `develop`. Never `main`.

Don't push, don't edit `.env`, and don't run anything against a real crontab unless I asked for it in the message you are answering. If a variable is missing, name it and ask.

Treat all of this as good defaults. What I ask for in the message you are answering beats anything here. What you decided on your own does not, so if a rule here fights the task, say so and ask.

## Taste

- No comments. Say it in the naming, or say it to me in the pull request.
- Arrow functions. Short, honest names. If the name needs a paragraph, the function is doing too much.
- `any` is not a solution. Catch `unknown` and narrow it.
- Constants over magic strings, especially for anything that ends up in a cron line or a shell command.
- Log when you catch, through the project logger, with a scope. Never `console.*`, the tests will catch you. Never log a secret or a whole crontab.
- Small files and real modules. Shared logic lives in one place. If the client and the server both need it, they import the same thing instead of keeping two copies that drift.
- New abstractions earn their place. Two similar things are not a pattern.
- The UI is terminal-styled and themed. Reuse the theme variables and the existing components so every theme and dark mode keep working. Nothing hardcoded green on black.
- Keep it quirky. The tag is `cr*nmaster`, the asterisk is red, and commit messages are allowed to have opinions. Understandable first, funny second.

## Words

Same words for the same things, please.

- **you** is the agent reading this. **we** is me, fccview, plus whoever is contributing. **user** is somebody using a running instance, not the developer and not me.
- **instance** is one deployment somebody self-hosts. **host** is the machine whose crontabs we manage. In Docker that is not the container.
- **job** is one cron entry with its schedule, command and our metadata. **crontab user** is the account that owns it and that it runs as.
- **run now** is a manual run from the UI or API. **scheduled run** is the host's cron doing its job. Both write logs when logging is on.
- **wrapper** is the script that wraps a job's command when logging is on, and writes its log on the host.
- **script** is a file in the scripts library. **snippet** is a reusable piece of bash for the editor. **backup** is a saved copy of a job that can be restored.
- **howto** is the user-facing documentation, written for the person running the instance.

## Verifying

Smallest thing that proves the change works. Type check, lint with zero warnings, and the tests covering the area. Run the whole suite if you touched something shared.

Bug fixes come with a regression test where it is practical. If you changed behaviour the tests cover, update them and tell me you did.

The tests around auth, injection, path containment and crontab line round-trips exist because those things broke, or nearly did. If your change makes one of them fail, the change is wrong until proven otherwise.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
