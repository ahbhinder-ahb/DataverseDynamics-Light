
import { useEffect } from 'react';

/**
 * Custom hook to manage SEO metadata (title and meta description)
 * @param {Object} metadata - The SEO metadata object
 * @param {string} metadata.title - The page title
 * @param {string} metadata.description - The page meta description
 */
export const useSEO = ({ title, description }) => {
  useEffect(() => {
    // Ensure document is available (safe for SSR/testing environments)
    if (typeof document === 'undefined') return;

    // Update Document Title
    if (title) {
      document.title = title;
    }

    // Update Meta Description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      
      // Create the meta tag if it doesn't exist
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      
      // Set the content
      metaDescription.setAttribute('content', description);
    }
  }, [title, description]);
};
