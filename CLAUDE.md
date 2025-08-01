## Project Goals
- I am building EverJust.dev, an AI-powered development platform using the claude-code SDK

## Preferences
- don't try to run the script with your own bash tool. Write the script and tell me how to execute it, asking me for its output instead.

## Progress so far
- We have a website that takes in a prompt, uses claude code SDK to write code. But currently, it directly modifies my websites code by adding it as a page. The next task we are going to work on is making the code gen happen in an isolated environment and opening the dev server there.
- We have created a way to create sandboxes using daytona and preview them in using the getPreviewLink() function. The script scripts/test-preview-url.ts confirms this.
 