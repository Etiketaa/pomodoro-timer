// Slideshow functionality for Pomodoro Timer
document.addEventListener('DOMContentLoaded', () => {
    const slideshowImages = document.querySelectorAll('.slideshow-image');

    if (slideshowImages.length === 0) return;

    let currentSlide = 0;
    const slideInterval = 8000; // Change image every 8 seconds

    function showNextSlide() {
        // Remove active class from current slide
        slideshowImages[currentSlide].classList.remove('active');

        // Move to next slide
        currentSlide = (currentSlide + 1) % slideshowImages.length;

        // Add active class to new slide
        slideshowImages[currentSlide].classList.add('active');
    }

    // Start the slideshow
    setInterval(showNextSlide, slideInterval);

    // Preload all images for smooth transitions
    slideshowImages.forEach(slide => {
        const bgImage = slide.style.backgroundImage;
        const imageUrl = bgImage.slice(5, -2); // Extract URL from url('...')
        const img = new Image();
        img.src = imageUrl;
    });
});
