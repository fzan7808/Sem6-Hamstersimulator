document.addEventListener('DOMContentLoaded', () => {
    console.log('%cRL Hamster Simulator geladen 🚀', 'color: #00eaff; font-size: 16px;');

    const buttons = document.querySelectorAll('.nav-button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            button.style.transform = 'scale(1.2)';
            setTimeout(() => button.style.transform = 'scale(1)', 200);
        });
    });
});
