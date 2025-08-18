# Cron Job Manager

A modern, web-based interface for managing cron jobs across different operating systems (Linux, macOS, Windows). Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🌐 **Cross-platform support**: Works on Linux, macOS, and Windows
- 🎨 **Modern UI**: Beautiful, responsive interface with dark/light mode
- 📊 **System Information**: Display hostname, IP address, uptime, memory, and CPU info
- ⏰ **Cron Job Management**: View, create, and delete cron jobs with comments
- 🐳 **Docker Support**: Run entirely from a Docker container
- 🔧 **Easy Setup**: Quick presets for common cron schedules

## Quick Start

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd cronjob-manager
```

2. Build and run with Docker Compose:
```bash
docker-compose up --build
```

3. Open your browser and navigate to `http://localhost:3000`

### Testing Docker Build

To test the Docker build without running the full application:

```bash
./test-docker.sh
```

### Local Development

1. Install dependencies:
```bash
yarn install
```

2. Run the development server:
```bash
yarn dev
```

3. Open your browser and navigate to `http://localhost:3000`

## Docker Configuration

The application is configured to run in a Docker container with the following setup:

- **Host Network Mode**: Allows access to system information
- **Volume Mounts**: Mounts necessary system directories for cron access
- **Root User**: Required for cron operations
- **Security**: Minimal privileges with proper security options

### Important Notes for Docker

- The container runs with `network_mode: host` to access system information
- Root user is required for cron operations
- System directories are mounted as read-only for security
- The container has minimal capabilities for security

## Usage

### Viewing System Information

The application automatically detects your operating system and displays:
- Platform (Linux/macOS/Windows)
- Hostname
- IP Address
- System Uptime
- Memory Usage
- CPU Information

### Managing Cron Jobs

1. **View Existing Jobs**: All current cron jobs are displayed with their schedules and commands
2. **Create New Jobs**: Use the form on the right side to create new cron jobs
3. **Quick Presets**: Click on preset buttons for common schedules
4. **Add Comments**: Include descriptions for your cron jobs
5. **Delete Jobs**: Remove unwanted cron jobs with the delete button

### Cron Schedule Format

The application uses standard cron format: `* * * * *`

- First field: Minute (0-59)
- Second field: Hour (0-23)
- Third field: Day of month (1-31)
- Fourth field: Month (1-12)
- Fifth field: Day of week (0-7, where 0 and 7 are Sunday)

## Project Structure

```
app/
├── _components/          # Reusable UI components
│   ├── ui/              # Base UI components
│   ├── SystemInfo.tsx   # System information display
│   ├── CronJobList.tsx  # Cron jobs list
│   └── CronJobForm.tsx  # Create new cron job form
├── _utils/              # Utility functions
│   ├── cn.ts           # Class name utility
│   └── system.ts       # System operations
├── _server/             # Server actions
│   └── actions/        # API endpoints
├── globals.css         # Global styles
├── layout.tsx          # Root layout
└── page.tsx            # Main page
```

## Technologies Used

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons
- **next-themes**: Dark/light mode support
- **Docker**: Containerization

## Security Considerations

- The application requires root access for cron operations
- System directories are mounted as read-only
- Container runs with minimal capabilities
- Input validation is implemented for all user inputs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the GitHub repository.
