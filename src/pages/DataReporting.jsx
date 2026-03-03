import React, { useEffect } from 'react';
import { Database } from 'lucide-react';
import ServicePageLayout from '@/components/ServicePageLayout';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';

const DataReporting = () => {
  useSEO(seoMetadata["/data-reporting"]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const theme = {
    gradient: "from-cyan-500 to-cyan-700",
    iconGradient: "from-cyan-400 to-cyan-600",
    textAccent: "text-cyan-400",
    hoverTextAccent: "hover:text-cyan-300",
    bgAccent: "bg-cyan-500",
    border: "border-cyan-500",
    shadow: "shadow-cyan-500/20",
    button: "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-900/20"
  };

  const services = [
    {
      id: 'data-management',
      title: 'Data Management',
      description: 'Ensure your data is accurate, accessible, and secure. We implement robust data governance and architecture to turn your raw data into a strategic asset.',
      details: ['Data cleansing', 'Database administration', 'Data governance', 'Security & compliance']
    },
    {
      id: 'business-analysis',
      title: 'Business Analysis',
      description: 'Bridge the gap between business needs and technical solutions. Our analysts identify requirements and opportunities to drive value through technology.',
      details: ['Requirements gathering', 'Gap analysis', 'Solution assessment', 'Stakeholder engagement']
    },
    {
      id: 'advanced-reporting',
      title: 'Advanced Reporting',
      description: 'Transform data into actionable insights. We design custom reports and interactive dashboards that provide real-time visibility into your key metrics.',
      details: ['Custom dashboards', 'Automated reporting', 'Visualization design', 'Trend analysis']
    },
    {
      id: 'documentation',
      title: 'Documentation',
      description: 'Maintain clear and comprehensive records. We create technical documentation, user manuals, and process guides to ensure knowledge retention.',
      details: ['Technical writing', 'Process mapping', 'User guides', 'Knowledge base creation']
    },
    {
      id: 'performance-metrics',
      title: 'Performance Metrics',
      description: 'Define and track what matters. We help you establish the right metrics to measure success at every level of your organization.',
      details: ['Metric definition', 'Scorecard development', 'Benchmarking', 'Performance reviews']
    },
    {
      id: 'kpi-tracking',
      title: 'KPI Tracking',
      description: 'Monitor your Key Performance Indicators effectively. Our systems ensure you stay on top of critical goals and can pivot quickly when needed.',
      details: ['Real-time monitoring', 'Goal setting', 'Alert configuration', 'Strategic alignment']
    }
  ];

  return (
    <ServicePageLayout
      title="Data & Reporting"
      description="Transform raw data into strategic intelligence. Our data and reporting services empower you with the insights needed to measure performance and predict future trends."
      icon={Database}
      theme={theme}
      services={services}
      backgroundImage="https://images.unsplash.com/photo-1516383274235-5f42d6c6426d"
    />
  );
};

export default DataReporting;