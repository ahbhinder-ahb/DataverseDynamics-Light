import React, { useEffect } from 'react';
import { Package } from 'lucide-react';
import ServicePageLayout from '@/components/ServicePageLayout';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';

const BackOfficeOperations = () => {
  useSEO(seoMetadata["/back-office-operations"]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const theme = {
    gradient: "from-blue-600 to-blue-800",
    iconGradient: "from-blue-500 to-blue-700",
    textAccent: "text-blue-400",
    hoverTextAccent: "hover:text-blue-300",
    bgAccent: "bg-blue-500",
    border: "border-blue-500",
    shadow: "shadow-blue-500/20",
    button: "bg-blue-600 hover:bg-blue-700 shadow-blue-900/20"
  };

  const services = [
    {
      id: 'supply-chain',
      title: 'Supply Chain Management',
      description: 'Optimize your supply chain from end-to-end. We streamline logistics, enhance visibility, and ensure resilience against disruptions, ensuring your products move efficiently from origin to destination.',
      details: ['Logistics optimization', 'Vendor management', 'Demand planning', 'Risk mitigation']
    },
    {
      id: 'procurement',
      title: 'Procurement',
      description: 'Strategic sourcing and purchasing solutions designed to reduce costs and improve quality. We handle vendor negotiations, contract management, and purchase order processing.',
      details: ['Strategic sourcing', 'Contract negotiation', 'Purchase order management', 'Supplier relationship management']
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      description: 'Maintain optimal stock levels with our comprehensive inventory solutions. We utilize advanced tracking and forecasting to prevent stockouts and minimize carrying costs.',
      details: ['Stock level optimization', 'Inventory forecasting', 'Warehouse management', 'Audit & reconciliation']
    },
    {
      id: 'returns',
      title: 'Returns Management',
      description: 'Transform your reverse logistics into a competitive advantage. We process returns efficiently, maximizing recovery value and improving customer satisfaction through streamlined handling.',
      details: ['Reverse logistics', 'RMA processing', 'Refurbishment coordination', 'Disposal management']
    },
    {
      id: 'payroll-hr',
      title: 'Payroll & HR Services',
      description: 'Ensure accurate and timely compensation for your workforce. Our HR services cover the entire employee lifecycle, from onboarding to benefits administration and compliance.',
      details: ['Payroll processing', 'Benefits administration', 'Compliance reporting', 'Employee data management']
    },
    {
      id: 'recruitment',
      title: 'Recruitment Services',
      description: 'Attract top talent with our targeted recruitment strategies. We handle job postings, candidate screening, and interview coordination to build your dream team efficiently.',
      details: ['Talent sourcing', 'Candidate screening', 'Interview coordination', 'Onboarding support']
    },
    {
      id: 'commissions',
      title: 'Employee/Vendor Commissions',
      description: 'Automate and accurately calculate complex commission structures. We ensure your sales teams and partners are paid correctly and on time, boosting morale and trust.',
      details: ['Commission calculation', 'Payout scheduling', 'Dispute resolution', 'Performance tracking']
    },
    {
      id: 'ap-ar',
      title: 'AP/AR Management',
      description: 'Maintain healthy cash flow with rigorous Accounts Payable and Accounts Receivable management. We optimize invoicing, collections, and payment processing.',
      details: ['Invoice processing', 'Collections management', 'Cash flow reporting', 'Payment reconciliation']
    },
    {
      id: 'treasury',
      title: 'Treasury Operations',
      description: 'Manage your organization’s liquidity and financial risk. Our treasury services include cash positioning, bank relationship management, and investment oversight.',
      details: ['Cash positioning', 'Liquidity management', 'Bank relations', 'Financial risk management']
    },
    {
      id: 'loss-prevention',
      title: 'Loss Prevention',
      description: 'Protect your assets and bottom line. We implement strategies to detect and prevent shrinkage, fraud, and operational errors across your business.',
      details: ['Fraud detection', 'Inventory shrinkage control', 'Security audits', 'Policy enforcement']
    },
    {
      id: 'internal-audits',
      title: 'Internal Audits',
      description: 'Ensure compliance and operational integrity. Our internal audit services identify control weaknesses and process inefficiencies, providing actionable recommendations for improvement.',
      details: ['Process audits', 'Compliance verification', 'Risk assessment', 'Control testing']
    },
    {
      id: 'travel',
      title: 'Staff Travel Management',
      description: 'Streamline corporate travel with cost-effective booking and expense management solutions. We ensure policy compliance while providing support for your traveling workforce.',
      details: ['Itinerary planning', 'Expense management', 'Travel policy compliance', '24/7 support']
    },
    {
      id: 'gift-cards',
      title: 'Gift Cards & Vouchers',
      description: 'Manage your gift card programs effectively. From issuance and activation to redemption tracking and liability reporting, we handle all aspects of voucher processing.',
      details: ['Program administration', 'Redemption tracking', 'Liability reporting', 'Fraud prevention']
    }
  ];

  return (
    <ServicePageLayout
      title="Back-Office Operations"
      description="Streamline your core business functions with our comprehensive back-office solutions. From supply chain to finance, we handle the complexities so you can focus on growth."
      icon={Package}
      theme={theme}
      services={services}
      backgroundImage="https://images.unsplash.com/photo-1692914274476-0e6920cc80cf"
    />
  );
};

export default BackOfficeOperations;