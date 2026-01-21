document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', function() {
        const content = this.nextElementSibling;
        const isActive = this.classList.contains('active');
        
        // Close all accordions
        document.querySelectorAll('.accordion-header').forEach(h => {
            h.classList.remove('active');
            h.nextElementSibling.classList.remove('active');
        });
        
        // Open clicked accordion if it wasn't active
        if (!isActive) {
            this.classList.add('active');
            content.classList.add('active');
        }
    });
});