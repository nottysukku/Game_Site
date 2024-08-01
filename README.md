
# Game Site!

A simple webpage containing all my web+game projects!

## Table of Contents

- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Folder Structure](#folder-structure)
- [Available Scripts](#available-scripts)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (version 14.x or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/nottysukku/Game_Site.git
   ```

2. Navigate to the project directory:

   ```sh
   cd Game_Site
   ```

3. Install the dependencies:

   ```sh
   npm install
   # or
   yarn install
   ```

### Usage

1. Start the development server:

   ```sh
   npm run dev
   # or
   yarn dev
   ```

2. Open your browser and go to `http://localhost:3000` to see the application running.

## Folder Structure

```
Game_Site/
├── node_modules/
├── public/
│   ├── favicon.ico
│   └── index.html
├── src/
│   ├── assets/
│   ├── components/
│   ├── pages/
│   ├── App.jsx
│   ├── index.css
│   ├── main.jsx
│   └── index.js
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

- `public/`: Static assets like HTML and favicon.
- `src/`: Main source folder.
  - `assets/`: Assets like images and fonts.
  - `components/`: Reusable React components.
  - `pages/`: React components representing different pages.
  - `App.jsx`: Main App component.
  - `index.css`: Global CSS styles.
  - `main.jsx`: Entry point for React.
- `.gitignore`: List of files and directories to be ignored by Git.
- `package.json`: Project metadata and dependencies.
- `postcss.config.js`: Configuration for PostCSS.
- `tailwind.config.js`: Configuration for Tailwind CSS.
- `vite.config.js`: Configuration for Vite.

## Available Scripts

- `npm run dev` / `yarn dev`: Start the development server.
- `npm run build` / `yarn build`: Build the project for production.
- `npm run serve` / `yarn serve`: Serve the production build locally.

## Contributing

Contributions are welcome!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
