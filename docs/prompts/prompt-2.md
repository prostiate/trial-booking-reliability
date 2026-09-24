not yet merge, next on the readme on the section: Time Spent, Assumptions, Scope Cuts & Post-Release Plan

you should check from gitlog first like first commit, and after that it quite takes time to write prompt docs/prompts/prompt-1.md , and then our earlier conversations prompts and responses, until now i think this is completed so thats the time spent. i have also manually test, i have to manually steer the frontend to make sure it align the backend core functionality + add shortcuts to simulate the requirements.

so then on AI_USAGE.md , it should have the same format and this is my take:

- which AI tools you used
im using completely antigravity gemini 3.8 flash high because this is the fastest and quite okay-ish model to use since we have 4 hours cap time on the assignment. but since the gemini is not strong and intelligence enough like claude opus or sol/astra open ai but those models are not fast enough so then i have to choose the gemini and have to write prompt with clear instructions, requirements, helping the AI to avoid and prevent the ambiguous from the assignment requirements, making the AI asking questions before implementation, doing design first using skills frontend-design and lavish while doing setup in paralel and on design i need to steer to make it clear, clean and on point. so thats what im doing.

- what you used AI for
I used AI for complete full stack development, design, tests, deployment. thats why i must write prompt complete enough to gemini to do that. and I also brainstorming about what the possibilities and extended possibilities about the assignment considering the last-seat race condition, concurrent, in-memory deployment leaking with securing and hardening to make sure my cloudflare worker cost are not inflated.

- one place where AI helped you move faster
everything; code generation, planning, strategy, architectures, seeding, tests, solutions, approaches, documenting. but again i have to make sure the prompt at initial prompt must be very clear and complete, make sure avoid and preventing the assumptions made by the AI

- one place where you disagreed with, corrected, or rejected AI output
on the frontend part, i have to rejected the bloated UI made by the gemini on initial, so then i have to bring the skills lavish + frontend design skill, but still i have to steer on how the frontend gonna looks like + it will align with the backend and make sure it met the requirements by the assignment said. and on the backend part, i have multiple times steers that make the structure codes, routes api to production grade not demo simulator, because it still assuming the requirements that i gave are for demo simulator not and not the production grade product, so when it confirmed + the frontend also aligned with production grade product, the AI finally understand what I intend to develop.

- what you would change about your AI workflow if you had to do this again
change the model not to using gemini, minimum openai sol or astra or claude opus, because to make sure on initial prompt, the goal will not being too much vague and clear, and not much having hallucinations and assumptions, again not saying the openai or claude will not making hallucinations or assumptions, but still those models have more intelligence, reasoning better than gemini. and also i have to write more robust, clear, clean prompt, because since this is very limited time, the prompt are very poory stated about the requirements, what to build, the goals, the targets and else.

- how you verified the final implementation
the product should be on production grade, meaning doing brainstorming about does we met the requirements thats the very important one, and could we extend it without breaking the requirements? do me as a human can and understand the codebase especially on the core function and me as a human can mock the frontend based on the requirements? if all of that green, then i can confidently said that this complete.