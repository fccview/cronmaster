# How to contribute

Hi, it's amazing having a community willing to push new feature to the app, and I am VERY open to contributors pushing their idea, it's what makes open source amazing.

That said for the sake of sanity let's all follow the same structure:

- When creating a new branch, do off from the develop branch, this will always be ahead of main and it's what gets released
- When creating a pull request, direct it back into develop, I'll then review it and merge it. Your code will end up in the next release that way and we all avoid conflicts!
- Please bear with on reviews, it may take a bit of time for me to go through it all on top of life/work/hobbies :)

## Some best practices

### Code Quality

- Follow the existing code style and structure
- Keep files modular and under 250-300 (split into smaller components if needed) lines unless it's a major server action, these can get intense I know 
- Avoid code duplication - reuse existing functions and UI components, don't hardcode html when a component already exists (e.g. <button> vs <Button>)
- All imports should be at the top of the file unless it's for specific server actions
- Avoid using `any` 
- Don't hardcode colors! Use the theme variables to make sure light/dark mode keep working well
- Make sure the UI is consistent with the current one, look for spacing issues, consistent spacing really makes a difference

### Pull Requests

- Keep PRs focused on a single feature or fix
- Update documentation if your changes affect user-facing features
- Test your changes locally before submitting

### Getting Started

1. Fork the repository
2. Create a feature branch from `develop`
3. Make your changes
4. Test thoroughly
5. Submit a pull request to `develop`

Thank you for contributing! <3