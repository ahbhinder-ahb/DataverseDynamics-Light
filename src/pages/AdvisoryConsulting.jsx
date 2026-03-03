import React, { useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import ServicePageLayout from '@/components/ServicePageLayout';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';

const AdvisoryConsulting = () => {
  useSEO(seoMetadata["/advisory-consulting"]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const theme = {
    gradient: "from-green-600 to-green-800",
    iconGradient: "from-green-500 to-green-700",
    textAccent: "text-green-400",
    hoverTextAccent: "hover:text-green-300",
    bgAccent: "bg-green-500",
    border: "border-green-500",
    shadow: "shadow-green-500/20",
    button: "bg-green-600 hover:bg-green-700 shadow-green-900/20"
  };

  const services = [
    {
      id: 'operational-decisions',
      title: 'Operational Decisions',
      description: 'Data-driven guidance for day-to-day operational choices. We help you navigate complex scenarios to improve efficiency and responsiveness.',
      details: ['Workflow optimization', 'Resource allocation', 'Performance benchmarking', 'Operational strategy']
    },
    {
      id: 'financial-decisions',
      title: 'Financial Decisions',
      description: 'Strategic financial planning and analysis. We provide insights for budgeting, investment, and cost control to ensure sustainable financial health.',
      details: ['Budget planning', 'Cost benefit analysis', 'Investment strategy', 'Financial modeling']
    },
    {
      id: 'organizational-decisions',
      title: 'Organizational Decisions',
      description: 'Shape your organization for success. We assist with structural changes, role definitions, and culture building to align your workforce with business goals.',
      details: ['Organizational design', 'Role definition', 'Culture alignment', 'Change management']
    },
    {
      id: 'process-improvement',
      title: 'Process Improvement',
      description: 'Identify and eliminate bottlenecks. Our continuous improvement methodologies (Lean, Six Sigma) streamline workflows and enhance productivity.',
      details: ['Value stream mapping', 'Waste reduction', 'Standard operating procedures', 'Efficiency audits']
    },
    {
      id: 'restructuring',
      title: 'Restructuring',
      description: 'Navigate major organizational changes with confidence. Whether downsizing or pivoting, we provide the roadmap for a smooth transition.',
      details: ['Turnaround strategy', 'Merger integration', 'Divestiture planning', 'Workforce realignment']
    },
    {
      id: 'capacity-building',
      title: 'Capacity Building',
      description: 'Empower your team with new skills and capabilities. We design training programs and knowledge management systems to foster long-term growth.',
      details: ['Skills training', 'Knowledge management', 'Leadership development', 'Team workshops']
    },
    {
      id: 'project-management',
      title: 'Project Management',
      description: 'Deliver projects on time and within budget. Our PMO services provide the frameworks and oversight needed for successful project execution.',
      details: ['Project planning', 'Risk management', 'Stakeholder communication', 'Agile implementation']
    },
    {
      id: 'governance',
      title: 'Governance Frameworks',
      description: 'Establish robust governance structures. We help you define policies, compliance standards, and decision-making authority to ensure accountability.',
      details: ['Policy development', 'Compliance frameworks', 'Board advisory', 'Ethics & standards']
    }
  ];

  return (
    <ServicePageLayout
      title="Advisory & Consulting"
      description="Navigate complex business challenges with our expert advisory services. We provide the strategic guidance and practical frameworks you need to make informed decisions and drive sustainable growth."
      icon={TrendingUp}
      theme={theme}
      services={services}
      backgroundImage="https://images.unsplash.com/photo-1690192079529-9fd57e5b24d0"
    />
  );
};

export default AdvisoryConsulting;