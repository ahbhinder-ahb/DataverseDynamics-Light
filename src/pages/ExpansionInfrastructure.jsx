import React, { useEffect } from 'react';
import { Building2 } from 'lucide-react';
import ServicePageLayout from '@/components/ServicePageLayout';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';

const ExpansionInfrastructure = () => {
  useSEO(seoMetadata["/expansion-infrastructure"]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const theme = {
    gradient: "from-teal-600 to-teal-800",
    iconGradient: "from-teal-500 to-teal-700",
    textAccent: "text-teal-400",
    hoverTextAccent: "hover:text-teal-300",
    bgAccent: "bg-teal-500",
    border: "border-teal-500",
    shadow: "shadow-teal-500/20",
    button: "bg-teal-600 hover:bg-teal-700 shadow-teal-900/20"
  };

  const services = [
    {
      id: 'white-space',
      title: 'White Space Management',
      description: 'Identify and capitalize on untapped market opportunities. We analyze gaps in your coverage to find new avenues for growth and expansion.',
      details: ['Market gap analysis', 'Opportunity assessment', 'Territory planning', 'Growth strategy']
    },
    {
      id: 'site-relocations',
      title: 'Site Relocations',
      description: 'Manage complex moves seamlessly. From planning to execution, we ensure your business relocations are handled with minimal downtime.',
      details: ['Site selection', 'Move logistics', 'IT migration', 'Change management']
    },
    {
      id: 'facility-closures',
      title: 'Facility Closures',
      description: 'Handle decommissioning responsibly and efficiently. We manage the logistical, legal, and operational aspects of closing facilities.',
      details: ['Asset disposition', 'Lease termination', 'Compliance management', 'Workforce transition']
    },
    {
      id: 'transition-planning',
      title: 'Transition Planning',
      description: 'Structured approach to major operational shifts. We provide the detailed roadmaps needed to navigate periods of significant change.',
      details: ['Phase planning', 'Resource scheduling', 'Risk mitigation', 'Stakeholder communication']
    },
    {
      id: 'vendor-coordination',
      title: 'Vendor Coordination',
      description: 'Align your third-party partners with your expansion goals. We manage vendor relationships to ensure support services scale with your growth.',
      details: ['Vendor selection', 'Service level agreements', 'Performance monitoring', 'Contract management']
    }
  ];

  return (
    <ServicePageLayout
      title="Expansion & Infrastructure"
      description="Scale your physical and operational footprint with confidence. We manage the complexities of growth, transitions, and infrastructure changes so you can focus on the big picture."
      icon={Building2}
      theme={theme}
      services={services}
      backgroundImage="https://images.unsplash.com/photo-1681222897726-d3fdcb278117"
    />
  );
};

export default ExpansionInfrastructure;