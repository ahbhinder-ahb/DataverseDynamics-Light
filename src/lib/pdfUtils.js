import { toast } from "@/components/ui/use-toast";

export const generateInvoicePDF = async (elementId, filename = 'invoice.pdf') => {
  try {
    // Dynamic import to avoid SSR issues and keep initial bundle small
    const html2pdf = (await import('html2pdf.js')).default;
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error("Invoice element not found");
    }

    const opt = {
      margin:       10,
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    toast({
      title: "Generating PDF",
      description: "Please wait while your document is prepared...",
    });

    await html2pdf().set(opt).from(element).save();
    
    toast({
      title: "Success",
      description: "PDF downloaded successfully.",
    });
  } catch (error) {
    console.error("PDF Generation error:", error);
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to generate PDF. Please try again.",
    });
  }
};