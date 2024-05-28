// tailwind.config.js
module.exports = {
    purge: {
      enabled: !process.env.ROLLUP_WATCH,
      content: ['./public/index.html', './src/**/*.svelte'],
      options: {
        defaultExtractor: content => [
          ...(content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || []),
          ...(content.match(/(?<=class:)[^=>\/\s]*/g) || []),
        ],
      },
    },
    darkMode: 'media', // or 'media' or 'class'
    theme: {
      extend: {},
    },
    variants: {
      extend: {},
    },
    plugins: [],
  }