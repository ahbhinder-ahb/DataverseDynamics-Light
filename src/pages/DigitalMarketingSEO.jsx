import React, { useEffect } from 'react';
import { Target } from 'lucide-react';
import ServicePageLayout from '@/components/ServicePageLayout';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';

const DigitalMarketingSEO = () => {
  useSEO(seoMetadata["/digital-marketing-seo"]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const theme = {
    gradient: "from-orange-600 to-red-700",
    iconGradient: "from-orange-500 to-red-600",
    textAccent: "text-orange-400",
    hoverTextAccent: "hover:text-orange-300",
    bgAccent: "bg-orange-500",
    border: "border-orange-500",
    shadow: "shadow-orange-500/20",
    button: "bg-orange-600 hover:bg-orange-700 shadow-orange-900/20"
  };

  const services = [
    {
      id: 'seo',
      title: 'Search Engine Optimization',
      description: 'Dominate search rankings and drive organic traffic. Our comprehensive SEO strategies improve your visibility, authority, and search performance across all major search engines.',
      details: ['Keyword research & strategy', 'On-page optimization', 'Technical SEO audits', 'Link building campaigns']
    },
    {
      id: 'ai-brand',
      title: 'AI Brand Optimization',
      description: 'Leverage artificial intelligence to optimize your brand presence. We use AI-powered tools to analyze market trends, predict consumer behavior, and enhance brand positioning.',
      details: ['AI-driven market analysis', 'Predictive brand insights', 'Automated brand monitoring', 'Smart content personalization']
    },
    {
      id: 'content-marketing',
      title: 'Content Marketing Strategy',
      description: 'Engage your audience with compelling content that converts. We develop strategic content plans that build authority, nurture leads, and strengthen customer relationships.',
      details: ['Content strategy development', 'Editorial calendar planning', 'Blog & article creation', 'Content distribution']
    },
    {
      id: 'social-media',
      title: 'Social Media Marketing',
      description: 'Build meaningful connections on social platforms. Our social media strategies increase engagement, grow your following, and turn followers into loyal customers.',
      details: ['Platform strategy', 'Community management', 'Content creation & scheduling', 'Influencer partnerships']
    },
    {
      id: 'email-marketing',
      title: 'Email Marketing Campaigns',
      description: 'Reach your audience directly with targeted email campaigns. We create personalized email strategies that nurture leads, boost engagement, and drive sales.',
      details: ['Campaign design & automation', 'List segmentation', 'A/B testing optimization', 'Performance analytics']
    },
    {
      id: 'analytics',
      title: 'Analytics & Reporting',
      description: 'Make data-driven decisions with comprehensive analytics. We track, measure, and report on all aspects of your digital marketing performance to maximize ROI.',
      details: ['Campaign tracking', 'Conversion analytics', 'Custom dashboards', 'Monthly performance reports']
    },
    {
      id: 'brand-strategy',
      title: 'Brand Strategy',
      description: 'Build a powerful brand that resonates with your target audience. We develop comprehensive brand strategies that differentiate you from competitors and create lasting impact.',
      details: ['Brand positioning', 'Competitive analysis', 'Brand messaging framework', 'Visual identity guidelines']
    }
  ];

  return (
    <ServicePageLayout
      title="Digital Marketing & SEO"
      description="Amplify your online presence and reach your target audience effectively. Our integrated digital marketing and SEO solutions drive traffic, engagement, and measurable business results."
      icon={Target}
      theme={theme}
      services={services}
      backgroundImage="https://images.unsplash.com/photo-1432888622747-4eb9a8f2c293"
    />
  );
};

export default DigitalMarketingSEO;
