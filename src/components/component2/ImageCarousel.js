import React, { useState, useEffect } from 'react';
import { Carousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { supabase } from '../../utils/supabaseClient';
import './ImageCarousel.css'; // हमारी फाइनल और बेहतरीन CSS

const ImageCarousel = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const { data, error } = await supabase
                    .from('carousel_images')
                    .select('image_url, alt_text, title, link_url')
                    .eq('is_active', true)
                    .order('display_order', { ascending: true });

                if (error) throw error;
                setImages(data);
            } catch (error) {
                console.error("Carousel तस्वीरें लोड करने में त्रुटि:", error.message);
                setError('तस्वीरें लोड नहीं हो सकीं।');
            } finally {
                setTimeout(() => setLoading(false), 500);
            }
        };
        fetchImages();
    }, []);

    // प्रीमियम स्केलेटन लोडर
    if (loading) {
        return (
            <div className="carousel-container">
                <div className="skeleton-loader"></div>
            </div>
        );
    }

    if (error) {
        return <div className="carousel-error">{error}</div>;
    }

    if (images.length === 0) {
        return null;
    }

    return (
        <div className="carousel-container">
            <Carousel
                showThumbs={false}
                autoPlay
                infiniteLoop
                showStatus={false}
                showArrows={false} // मोबाइल पर एरो नहीं दिखाएंगे, CSS इसे हैंडल करेगा
                interval={5000}
                transitionTime={700}
                className="custom-carousel"
                aria-label="Image Carousel"
            >
                {images.map((image, index) => {
                    // अगर link_url है तो 'a' टैग, वरना 'div' टैग इस्तेमाल करें
                    const Tag = image.link_url ? 'a' : 'div';
                    
                    const props = {
                        className: `slide-item ${image.link_url ? 'is-link' : ''}`,
                        // अगर 'a' टैग है तो ये प्रॉपर्टीज जोड़ें
                        ...(image.link_url && {
                            href: image.link_url,
                            target: '_blank',
                            rel: 'noopener noreferrer'
                        })
                    };

                    return (
                        <Tag key={index} {...props}>
                            <div className="image-wrapper">
                                <img src={image.image_url} alt={image.alt_text || 'Carousel Image'} />
                            </div>
                            {/* टाइटल तभी दिखाएं जब वह मौजूद हो */}
                            {image.title && (
                                <div className="legend-container">
                                    <p className="legend-text">{image.title}</p>
                                </div>
                            )}
                        </Tag>
                    );
                })}
            </Carousel>
        </div>
    );
};

export default ImageCarousel;