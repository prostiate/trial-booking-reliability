# Prompts

## Prompt 1

This session are finishing the tasks from my test home assignment on this job requirements:
Remote Full Stack Software Engineer
Ottodot[Lihat semua lowongan kerja](https://id.jobstreet.com/id/jobs?advertiserid=63851083)
[Bandung, Jawa Barat](https://id.jobstreet.com/id/Full-Stack-Software-Engineer-jobs/in-Bandung-West-Java) (Jarak jauh)
[Developer/Programmer (Teknologi Informasi & Komunikasi)](https://id.jobstreet.com/id/jobs-in-information-communication-technology/developers-programmers)
[Full time](https://id.jobstreet.com/id/Full-Stack-Software-Engineer-jobs/full-time)
Rp 28.000.000 – Rp 42.000.000 per month
Diposting 22 hari yang laluPelamar sangat banyak
Kamu telah mengirimkan lamaran pada 17 Sep 2026
About the role
Ottodot helps children learn math and science through live classes and game-based learning. We are building the platform layer around that experience: student homework, parent progress visibility, class operations, teacher workflows, and a self-serve enrollment funnel. We are looking for a senior full-stack product engineer who can be hands-on and own engineering judgment. You will help us turn a fast-moving founder-built platform into a reliable product that students, parents, teachers, and ops can trust.
Key responsibilities
Build and improve student, parent, teacher, and admin workflows
Stabilize login, account access, dashboards, class data, and homework flows
Help prepare the self-serve booking and enrollment system
Own technical decisions around architecture, data integrity, releases, and risk
Work closely with the founder to decide what to build now, what to defer, and how to ship quickly
About you
Strong full-stack experience across frontend, backend, and database work
Good judgment around production systems, auth, billing, migrations, permissions, and data quality
Can work in a messy real-world codebase
Cares about product quality and user experience
Can work independently and use AI coding agents as leverage
Interest in education, kids, games, and making learning feel more joyful
Strong spoken and written English
Like being close to product and users
Enjoy hands-on code work
Can turn ambiguity into a practical plan

and this is the email its already 2 days and i have to deliver within 5 days since that emailed to me:
HR
Sep 21, 2026, 5:14 PM (2 days ago)
to bcc: me
Dear Applicant
Thank you for applying for the Senior Full-Stack Engineer role at Ottodot.
We'd like to invite you to the next step: a take-home skill task. Please cap your time at 4 hours. We care more about backend correctness, edge cases, and your explanation than frontend polish.
Task instructions:
[https://docs.google.com/document/d/1Nt6lDm4KdhoA-Opqk9p30MCRSVUgsYeP/edit?usp=sharing](https://www.google.com/url?q=https://docs.google.com/document/d/1Nt6lDm4KdhoA-Opqk9p30MCRSVUgsYeP/edit?usp%3Dsharing&source=gmail&ust=1790050297135000&sa=E)
Please send back the following within 5 calendar days:
A link to your GitHub repo (public)
A link to a short video walkthrough (5–8 minutes) running through your solution and briefly explaining your approach
We look forward to your work. Thank you.
Best regards,
Ottodot HR

And the current project already git init. the tech stack doesnt specific on the job requirements and the task assignment, so I can assume they can accept hono as the backend, and nuxt as the frontend.

My decided backend will be using:

- hono and must use the command to instal: pnpm create hono@latest my-app (https://hono.dev/docs/getting-started/basic)
- zod
- in-memory
- no need any drizzle i believe? just simple seeder in-memory
- pnpm, turborepo + pnpm workspaces
- eslint check and format, prettier check and format, typescript check

My decided frontend will be using:

- zod
- must be using ui/nuxt and make clear, clean design ui ux no need fancy things
- any related on form validation to support the uinuxt form https://ui.nuxt.com/docs/components/form
- pinia for state management
- pnpm, turborepo + pnpm workspaces
- eslint check and format, prettier check and format, typescript check

My decided database:

- no database, just simple in-memory

My decided deployment:

- local MEANING not docker just bare local like pnpm dev etc using local server is a must is that make sense?
- local with docker compose, so make sure to add Dockerfile with stage build to make it efficient, build fast and cached and low size image
- i want to deploy on cloudflare worker, so then it will be 2 workers for backend and frontend. so then we have to make sure we have secure and have rate limit and have throttle on application layer to prevent spam, burst etc make sure security are harden full security and since i dont have subscription on cloudflare WAF only on subscription based plan. and the domain will be using trial-booking-reliability.irfankurniawan.com for frontend, and will be proxy i believe for the backend, is that possible
- so make sure all 3 way to run the application should be working

You must always looking for best practices, documentations:

- https://hono.dev/llms.txt
- https://ui.nuxt.com/docs/components
- https://nuxt.com/docs/4.x/guide/ai/llms-txt
- https://nuxt.com/docs/4.x/guide/concepts/rendering
- https://nuxt.com/docs/4.x/guide/concepts/nuxt-lifecycle
- https://nuxt.com/docs/4.x/guide/concepts/auto-imports
- https://nuxt.com/docs/4.x/guide/concepts/server-engine
- https://nuxt.com/docs/4.x/guide/concepts/code-style
- https://nuxt.com/docs/4.x/guide/concepts/server-components
- https://nuxt.com/docs/4.x/guide/concepts/typescript
- https://developers.cloudflare.com/llms-full.txt
- https://pinia.vuejs.org/core-concepts/
- https://pinia.vuejs.org/api/

You must create README clear enough based on what asked on the assignment.
You must also copy and follow on the coding standards and rules from: /home/vincent/backupirfanhehe/Downloads/workspaces/personal/bcapp and /home/vincent/backupirfanhehe/Downloads/workspaces/fe-amazone-monorepo. Look for it on both repo, i have it somewhere in that directory repo.

- so based on that coding standards and rules, i wanted to clarify that: it should be doesnt have any giant components or files, never using any or unknown type and if force like on tests file you should always have reason to it so then put it on eslint, prettier, typescript checks
- add pre push to check before doing push, because i cannot have github action working caused by billing issues (like wrong payment method etc, no need to ask i have confirmed that) and you can also follow on what i did on /home/vincent/backupirfanhehe/Downloads/workspaces/personal/bcapp
  You can also use the same pattern project structure with /home/vincent/backupirfanhehe/Downloads/workspaces/personal/bcapp, because it has the same backend and frontend and deployment except the database part and else, so it will be easier you to follow that as main reference.
  You must not mention any bcapp and fe-amazone-monorepo since this is gonna be public right and doesnt even make sense to put it there, so change it just saying like my projects repos. and also remove the complete path /home/vincent/backupirfanhehe/Downloads/workspaces/personal/ottodot-assignment-trial-booking-reliability, and just put it maybe ./trial-booking-reliability , since the repo name are: trial-booking-reliability.
  You must build only the specific on the problem, like i want production not demo simulator. So make the flow like this that i think of:

1. on the menu we should have like 1 select the parent first, and select the children, and select the seat that we wanted, and then we can choose its either we wanted to pay or just make it stale (to mock in progress payment but no need label for this) and when i choose another parent and children and select the same seat and i do checkout, it will success and the first parent when we back and/or submit it will got checkout error, just like checkout thingy like on ecommerce, instead of today its very ugly and not clear instruction
2. then we have simulator, which what we have, but make it concise and make it transition statuses with clear information about whats going on about the simulator.
3. so maybe theres on the menu that i can select parent and children? and then next step is to select seat available? just basically like commerse self payment like traveloka on selecting train , so we have also needs history make sure its paginated.

On cloudflare i will be connect the worker into repository and have deploy command maybe something like this: pnpm --filter @trial-booking/dashboard exec wrangler deploy and pnpm --filter @trial-booking/server exec wrangler deploy and the build command i believe maybe like this: pnpm --filter @trial-booking/server build and pnpm --filter @trial-booking/dashboard build , which this is only me guessing.

You also need to help me organize the AI_USAGE.md make sure add the md format then i will fill it, so then on assignment that needs human, you do not touch it but just tell me.

My take:

- i have account cloudflare and domain ready, you just need to create wrangler json and tell me when you done i will login or you run those to login and i will authenticated you. and after authenticated you can do all you needed like create D1, deploy backend frontend setup domain etc, and tell me the command to add connect github so it will be auto cloudflare build deploy once we push to main
- you must protect the branch main so it will always using PR to push to main branch. So then we will always and must using branch feature, and make sure to use and following the best practices of git commit: https://www.conventionalcommits.org
- Based on the test assignment on the google docs, you have to separate the me as human responsibilties and yours like on the problem and tasks requirements, you should be able to separate them, so we could focus on the tasks assignment not the my parts, is that make sense?
- I will be all in using gemini 3.8 flash high on this assignment test, why? because gemini 3.8 flash high are fast and smart enough to finish this assignment, and since i have very limited time so i have to write prompt with very clear instructions and requirements and also helping me to organize the assignment that can be given away to the AI completely and assignment that needed me as human to fulfill.
- the AI USAGE also meaning taking full control of generation code with clear direction from me as human, and i will steer it when I see something wrong on PR. I will and always review the PR and never blindly trust the AI completely. even though i have already given clear instructions on the prompt, the AI can and always have possibilities to messed up. So then review is a must for me atleast its for me to understand whats going on + i can learn from the AI how they can approach the code. I also will bring my coding standards and rules from my existing setup, so it will making me consistent across the projects that i handled. And of course readability and maintainability is required for me, because when HUMAN can read and understand it, so then AI will also understand that. So the codebase itself for me still needed to be have that readability and maintainability. And i have always care about the prompt that i made, so I can be at ease when AI doing troubleshoot, implementing features or modules or even complex things.

You never make any assumptions, if you have any confusion, ambiguous, ask me for clarify, verify, confirm.

Ask me anything first on what you understand based on this requirements, test assignment requirements, so then you can work smoothly.

I give you all authority until all green, but maybe we need to commit smaller so i can easily review what happened and then after all green -> create PR to merge into main so then before that you create branch feature first -> commit -> push -> create PR to merge into main.

---
