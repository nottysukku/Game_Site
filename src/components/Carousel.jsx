import React, { useState } from 'react';

const img1 = 'https://i.imgur.com/m0avwuP.png';
const img2 = 'https://i.imgur.com/ZXdFwrh.jpeg';
const img3 = 'https://m.media-amazon.com/images/I/81-JkdF5yFL._AC_UF1000,1000_QL80_.jpg';

const images = [img1, img2, img3];

const Carousel = ({ onTicTacToeClick, onSnakeClick, onSnakesandLaddersClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleClick = (index) => {
    if (index === 0) {
      onSnakeClick();
    } else if (index === 1) {
      onSnakesandLaddersClick();
    } else {
      onTicTacToeClick();
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  };

  return (
    <div className="relative overflow-hidden w-full h-full">
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((image, index) => (
          <div key={index} className="flex-shrink-0 w-full h-full">
            <img
              onClick={() => handleClick(index)}
              src={image}
              alt={`Slide ${index + 1}`}
              className="w-full h-[600px] object-cover"
            />
          </div>
        ))}
      </div>

      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white p-2 rounded-full shadow-lg focus:outline-none"
      >
        &lt;
      </button>
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white p-2 rounded-full shadow-lg focus:outline-none"
      >
        &gt;
      </button>
    </div>
  );
};

export default Carousel;
