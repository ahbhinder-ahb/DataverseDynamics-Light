import React, { useEffect } from 'react';
import { Globe } from 'lucide-react';
import ServicePageLayout from '@/components/ServicePageLayout';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';

const WebsiteDevelopment = () => {
  useSEO(seoMetadata["/website-development"]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const theme = {
    gradient: "from-purple-600 to-indigo-700",
    iconGradient: "from-purple-500 to-indigo-600",
    textAccent: "text-purple-400",
    hoverTextAccent: "hover:text-purple-300",
    bgAccent: "bg-purple-500",
    border: "border-purple-500",
    shadow: "shadow-purple-500/20",
    button: "bg-purple-600 hover:bg-purple-700 shadow-purple-900/20"
  };

  const services = [
    {
      id: 'custom-design',
      title: 'Custom Website Design',
      description: 'Create stunning, unique websites tailored to your brand identity. Our designers craft beautiful, user-friendly interfaces that engage visitors and drive conversions.',
      details: ['Bespoke design concepts', 'Brand-aligned aesthetics', 'User experience optimization', 'Mobile-first approach']
    },
    {
      id: 'ecommerce',
      title: 'E-Commerce Solutions',
      description: 'Build powerful online stores that maximize sales. We develop secure, scalable e-commerce platforms with seamless payment integration and intuitive shopping experiences.',
      details: ['Shopping cart integration', 'Payment gateway setup', 'Product management systems', 'Order tracking & fulfillment']
    },
    {
      id: 'responsive-dev',
      title: 'Responsive Web Development',
      description: 'Ensure your website looks perfect on every device. Our responsive development approach guarantees optimal viewing experiences across desktops, tablets, and smartphones.',
      details: ['Cross-device compatibility', 'Adaptive layouts', 'Performance optimization', 'Touch-friendly interfaces']
    },
    {
      id: 'cms',
      title: 'CMS Integration',
      description: 'Empower your team to manage content effortlessly. We integrate robust Content Management Systems that make updating your website simple, fast, and intuitive.',
      details: ['WordPress development', 'Headless CMS setup', 'Custom admin panels', 'Content workflow automation']
    },
    {
      id: 'maintenance',
      title: 'Website Maintenance',
      description: 'Keep your website running smoothly with proactive maintenance. We handle updates, security patches, backups, and performance monitoring to ensure continuous uptime.',
      details: ['Security updates', 'Performance monitoring', 'Content updates', 'Backup & disaster recovery']
    },
    {
      id: 'landing-pages',
      title: 'Landing Page Design',
      description: 'Convert visitors into customers with high-impact landing pages. We design focused, conversion-optimized pages that deliver measurable results for your campaigns.',
      details: ['Conversion rate optimization', 'A/B testing setup', 'Lead capture forms', 'Analytics integration']
    },
    {
      id: 'web-apps',
      title: 'Web Application Development',
      description: 'Build sophisticated web applications that power your business. From dashboards to complex SaaS platforms, we develop scalable, secure solutions tailored to your needs.',
      details: ['Custom functionality', 'API development', 'Database architecture', 'Cloud deployment']
    }
  ];

  return (
    <ServicePageLayout
      title="Website Development"
      description="Transform your digital presence with professional web development solutions. From stunning designs to powerful functionality, we create websites that drive business growth."
      icon={Globe}
      theme={theme}
      services={services}
      backgroundImage="https://images.unsplash.com/photo-1460925895917-afdab827c52f"
    />
  );
};

export default WebsiteDevelopment;
