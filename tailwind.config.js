// Tailwind CSS settings. The stylesheet css/styles.css is built from the
// class names used in index.html and src/*.js, so the app needs no
// internet connection to look right:
//
//   npx tailwindcss@3.4.17 -i css/input.css -o css/styles.css --minify
module.exports = {
    content: ["./index.html", "./src/**/*.js"],
    theme: { extend: {} },
    plugins: []
};
