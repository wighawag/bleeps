module.exports = {
  darkMode: 'class', // 'media' or 'class'
  mode: 'jit',
  purge: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        bleeps: {
          DEFAULT: '#dab894',
        },
      },
    },
  },
};
