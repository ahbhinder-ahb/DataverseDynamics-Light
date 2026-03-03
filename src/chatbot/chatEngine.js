import { knowledgeBase } from '@/chatbot/knowledgeBase';

// Company business hours configuration
const COMPANY_BUSINESS_HOURS = {
  startTime: '08:00', // 8:00 AM
  endTime: '17:30',   // 5:30 PM
  workDays: [1, 2, 3, 4, 5] // Monday=1 to Friday=5 (Sunday=0, Saturday=6)
};

function isBusinessDay(date) {
  return COMPANY_BUSINESS_HOURS.workDays.includes(date.getDay());
}

function getNextBusinessDay(startDate = new Date()) {
  const date = new Date(startDate);
  do {
    date.setDate(date.getDate() + 1);
  } while (!isBusinessDay(date));
  return date;
}

// List of offensive words to filter (includes root words that will catch variations)
const offensiveWords = [
  'damn', 'hell', 'crap', 'ass', 'stupid', 'idiot', 'asshole', 'bastard', 'bitch', 'fuck',
  'shit', 'slut', 'whore', 'dick', 'cock', 'pussy', 'dildo', 'blowjob', 'nigger', 'faggot',
  'retard', 'dumbass', 'motherfucker', 'goddamn', 'piss', 'suck', 'fucking', 'fucked', 'fucker',
  'bullshit', 'asshat', 'shitty', 'pissed', 'sucks', 'sucky', 'shitting', 'bitches'
];

// Function to check if message contains offensive language
export function containsOffensiveLanguage(text) {
  const lowerText = text.toLowerCase();
  return offensiveWords.some(word => {
    // Match word with flexible boundaries - catches word forms like "fucking", "fucked", etc.
    const regex = new RegExp(`(^|\\W)${word}(\\W|$)`);
    return regex.test(lowerText);
  });
}

const docs = [];

knowledgeBase.faqs.forEach((entry, index) => {
  docs.push({
    id: `faq-${index}`,
    type: 'faq',
    title: entry.q,
    content: entry.a
  });
});

knowledgeBase.servicePillars.forEach((pillar, index) => {
  docs.push({
    id: `pillar-${index}`,
    type: 'pillar',
    title: pillar.title,
    content: `${pillar.summary} Services: ${pillar.services.join(', ')}`
  });

  pillar.services.forEach((service, serviceIndex) => {
    docs.push({
      id: `service-${index}-${serviceIndex}`,
      type: 'service',
      title: service,
      content: `${service} is part of ${pillar.title}. ${pillar.summary}`
    });
  });
});

knowledgeBase.company.industries.forEach((industry, index) => {
  docs.push({
    id: `industry-${index}`,
    type: 'industry',
    title: industry,
    content: `${knowledgeBase.company.name} serves ${industry}.`
  });
});

// Custom lightweight search function to replace Fuse.js
function customSearch(query, documents) {
  if (!query) return [];
  const q = query.toLowerCase();
  // Ignore very generic interrogative words - they cause false positives
  const genericWords = ['who', 'what', 'where', 'when', 'why', 'how'];
  const words = q.split(/\s+/).filter(w => w.length > 2 && !genericWords.includes(w)); // Only match meaningful words, ignore generics

  const results = documents.map(doc => {
    const title = (doc.title || '').toLowerCase();
    const content = (doc.content || '').toLowerCase();
    let score = 1; // 1 means no match (higher is worse, like Fuse.js)

    // Prioritize exact phrase matches
    if (title.includes(q)) {
      score = 0.1;
    } else if (content.includes(q)) {
      score = 0.2;
    } else if (words.length > 0) {
      // Fallback to partial word matches
      let matchCount = 0;
      for (const word of words) {
        if (title.includes(word) || content.includes(word)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        // Calculate score based on proportion of matched words (between 0.3 and 0.45)
        score = 0.45 - ((matchCount / words.length) * 0.15);
      }
    }

    return { item: doc, score };
  }).filter(res => res.score < 1); // Only keep actual matches

  // Sort by best score (lowest number)
  results.sort((a, b) => a.score - b.score);

  return results;
}

// Utility to pick random response for variety
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Different greeting options for a more natural feel
const greetingResponses = [
  "Hey there! 👋 I'm the Dataverse assistant. I'm here to help you learn about our services and get you connected. What brings you here today?",
  "Hi! Welcome! 😊 I'm here to answer any questions about Dataverse Dynamics (Global) and our services. How can I help?",
  "Hello! Great to meet you! I'm your Dataverse assistant. I'd love to help you find the right service or answer any questions. What's on your mind?",
  "Hey! Thanks for stopping by! 👋 I'm here to guide you through our services. What would you like to know?"
];

// Service inquiry responses
const serviceInquiryResponses = {
  intro: [
    "Great question! We offer a wide range of services across six main areas. Let me tell you about them:",
    "Perfect timing! We have some really comprehensive services. Here's what we offer:",
    "Excellent! Let me break down our main service areas for you:"
  ],
  outro: [
    "Is there a specific service area you'd like to learn more about? I can dive deeper into any of these! 😊",
    "Would you like me to explain any of these in more detail? Just let me know!",
    "Any of these areas interest you? I'd be happy to tell you more!"
  ]
};

// Booking responses
const bookingResponses = [
  "Absolutely! You can schedule a free consultation with us using the 'Schedule Free Consultation' button on the website. It's quick and easy! 📅 What type of service are you thinking about?",
  "Great initiative! We'd love to chat with you. Click 'Schedule Free Consultation' at the top of the page, and we'll set up a time that works for you. What's your main interest?",
  "Perfect! Booking is super simple—just use the 'Schedule Free Consultation' button. By the way, what service area catches your interest most?"
];

// Industry/audience responses
const industryResponses = [
  "We work with diverse organizations! We serve Startups, SMEs, Enterprises, Public Organizations, Private Organizations, and Multinational Organizations. Each has unique needs, and we tailor our approach accordingly. Are you looking for support in a specific industry?",
  "That's one of our strengths—we support all types of organizations, from nimble startups to large enterprise operations. Whether you're public, private, or multinational, we can help. Tell me more about your organization?",
  "We've built expertise across many sectors. From fast-growing startups to established enterprises, we work with them all. What type of organization are you?"
];

// Company info responses
const companyResponses = [
  "We're Dataverse Dynamics (Global)—experts in business growth through consulting, operations, data, and digital services. We help ambitious organizations streamline, scale, and succeed. 🚀 What's your biggest business challenge right now?",
  "Dataverse Dynamics (Global) is your partner for business excellence. We specialize in making operations smoother, decisions smarter, and growth sustainable. What brings you here today?",
  "We're Dataverse Dynamics (Global), and we help businesses like yours navigate complexity and unlock growth through expert consulting and support services. Curious about what we do?"
];

// Empathetic challenge responses
const challengeResponses = [
  "I hear you. Those are challenges many organizations face. The good news? We've helped many like you overcome exactly these issues. What's your biggest pain point right now?",
  "Those are real challenges. But here's the thing—they're totally solvable with the right approach and partner. We've worked with tons of organizations facing these exact issues. Want to talk about what's troubling you most?",
  "Yeah, those are common struggles. The silver lining? We specialize in turning these challenges into growth opportunities. What's affecting your business the most?"
];

// Contact responses
const contactResponses = [
  "You can reach out using the 'Contact Us' button on the website—super easy! 📧 Or if you prefer a conversation, click 'Schedule Free Consultation' and we'll set up a call. What would work best for you?",
  "Happy to help connect you! Use 'Contact Us' on the site, or if you'd prefer to talk directly, book a 'Free Consultation.' Both are quick and easy. What's your preference?",
  "Great! You've got two options: 'Contact Us' for a message, or 'Schedule Free Consultation' for a direct chat. Which feels better to you?"
];

// Default helpful responses
const defaultResponses = [
  "That's a great question! I might not have all the details, but here's what I can tell you: we cover a lot of ground—from back-office ops to digital marketing and everything in between. Would it help if I focused on a specific area?",
  "Hmm, that's a specific one! While I might not have that exact detail in my knowledge base, I'm confident our team can help. Want to connect directly? You can 'Schedule a Free Consultation' or use 'Contact Us.'",
  "I love the specificity! Not all details are in my system, but our team definitely knows the answer. Want to chat with someone directly? 'Schedule Free Consultation' is the fastest way."
];

function contains(text, pattern) {
  return pattern.test(text);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getServiceKeywords(serviceName) {
  // Break service name into searchable keywords
  // E.g., "AI Brand Optimization" -> ["ai", "brand", "optimization", "optimize"]
  const words = serviceName.toLowerCase().split(/\s+/);
  const variants = [];

  for (const word of words) {
    variants.push(word);
    // Add common word variants
    if (word === 'optimization' || word === 'optimize') {
      variants.push('optimi', 'optim');
    }
    if (word === 'management') {
      variants.push('manage', 'manager');
    }
    if (word === 'reporting') {
      variants.push('report');
    }
    if (word === 'development') {
      variants.push('develop');
    }
    if (word === 'marketing') {
      variants.push('market');
    }
    if (word === 'recruitment' || word === 'recruiting') {
      variants.push('recruit', 'hire', 'hiring', 'staffing');
    }
    if (word === 'services' || word === 'service') {
      // Don't add variants for generic "service" word
    }
    if (word === 'intelligence' || word === 'analytics') {
      variants.push('analyst', 'analyze');
    }
    if (word === 'integration') {
      variants.push('integrat', 'integrate', 'integrated');
    }
    if (word === 'infrastructure') {
      variants.push('infra');
    }
  }

  return variants;
}

function getSpecificServiceMatch(normalizedText) {
  // Reject questions that are clearly not about our services
  // First reject location/geography questions regardless of other keywords
  const isLocationQuestion = /where\s+(is|are|can\s+i\s+find)|location|address|head\s+office|office\s+(address|location)|phone|contact|hours|open/i.test(normalizedText);

  if (isLocationQuestion) {
    return null; // Not a service match - fall through to general knowledge search
  }

  // Only consider questions with strong service-related keywords
  const hasServiceRelatedWords = /service|help|consult|solution|integration|develop|platform|optimization|management|strategy|marketing|seo|reporting|analysis|infrastructure|procurement|supply|chain|operational|financial|domain|website|app|ecommerce|cms|automation|audit|planning|recruit|hiring|hire|staffing|talent|payroll|hr|inventory|returns|commission|treasury|travel|loss|prevention|restructur|capacity|expansion|offshore|decision|govern|improve|train/i.test(normalizedText);

  if (!hasServiceRelatedWords) {
    return null;
  }

  // First try exact phrase match (most specific)
  for (const pillar of knowledgeBase.servicePillars) {
    for (const service of pillar.services) {
      const pattern = new RegExp(`\\b${escapeRegex(service.toLowerCase())}\\b`, 'i');
      if (pattern.test(normalizedText)) {
        return { pillar, service };
      }
    }
  }

  // Second try fuzzy/keyword matching for natural language queries
  // BUT with HIGH confidence threshold to avoid false positives
  const textWords = normalizedText.split(/\s+/).filter(w => w.length > 2);
  let bestMatch = null;
  let bestScore = 0;

  for (const pillar of knowledgeBase.servicePillars) {
    for (const service of pillar.services) {
      const serviceKeywords = getServiceKeywords(service);
      let matchScore = 0;

      // Score based on keyword matches
      for (const textWord of textWords) {
        for (const keyword of serviceKeywords) {
          // Exact word match (high confidence)
          if (textWord === keyword) {
            matchScore += 3;
          }
          // Partial match (prefix) - but only for longer words
          else if (keyword.startsWith(textWord) && textWord.length > 4) {
            matchScore += 2;
          }
          // Reverse partial match - very high bar
          else if (textWord.startsWith(keyword) && keyword.length > 4) {
            matchScore += 1;
          }
        }
      }

      // Also check the service description keywords
      const description = knowledgeBase.serviceDescriptions[service] || '';
      const descriptionWords = description.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      for (const textWord of textWords) {
        if (textWord.length > 4 && descriptionWords.some(dw => dw.includes(textWord) || textWord.includes(dw))) {
          matchScore += 1.5;
        }
      }

      // Increase threshold from 2 to 5 for higher confidence matching
      if (matchScore > bestScore && matchScore >= 5) {
        bestScore = matchScore;
        bestMatch = { pillar, service };
      }
    }
  }

  return bestMatch;
}

// Match pillar keywords (e.g., "data management" → "Data & Reporting")
function getSpecificPillarMatch(normalizedText) {
  const pillarKeywords = {
    'Back-Office Operations': ['back office', 'backoffice', 'supply chain', 'procurement', 'inventory', 'payroll', 'hr', 'hr services', 'finance', 'treasury', 'ap/ar', 'audit', 'recruitment', 'recruit', 'hiring', 'hire', 'staffing', 'talent', 'returns', 'commission', 'travel', 'loss prevention'],
    'Advisory & Consulting': ['consulting', 'strategy', 'strategic', 'advisory', 'advice', 'organizational', 'operational decision', 'financial decision', 'governance', 'restructuring', 'improvement', 'training', 'capacity building', 'project management'],
    'Data & Reporting': ['data management', 'data', 'reporting', 'analytics', 'analysis', 'insights', 'business intelligence', 'bi', 'dashboard', 'metrics', 'extraction', 'visualization'],
    'Expansion & Infrastructure': ['expansion', 'infrastructure', 'growth', 'scaling', 'scale', 'facility', 'capacity', 'operations setup', 'offshore', 'expansion strategy'],
    'Website Development': ['website', 'web development', 'web design', 'app development', 'mobile app', 'ecommerce', 'cms', 'platform', 'digital', 'frontend', 'backend', 'full stack'],
    'Digital Marketing & SEO': ['marketing', 'digital marketing', 'seo', 'search engine', 'content', 'branding', 'advertising', 'social media', 'email marketing', 'campaign', 'brand optimization']
  };

  for (const [pillarTitle, keywords] of Object.entries(pillarKeywords)) {
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword)) {
        const pillar = knowledgeBase.servicePillars.find(p => p.title === pillarTitle);
        if (pillar) {
          return pillar;
        }
      }
    }
  }

  return null;
}

// Answer special questions with real data
function answerSpecialQuestions(normalizedText) {
  // Current date/time answers - more flexible patterns
  if (/what.*day.*today|today.*day|what.*date|what.*day\s+is\b|day\s+today|current\s+date|today's\s+date/i.test(normalizedText)) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (isBusinessDay(today)) {
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();
      const isWithinHours = currentHour > 8 || (currentHour === 8 && currentMinute >= 0);
      const isBeforeClosing = currentHour < 17 || (currentHour === 17 && currentMinute < 30);

      if (isWithinHours && isBeforeClosing) {
        return `Today is ${dateStr}! 📅 Great—we're open right now (8 AM - 5:30 PM). Would you like to schedule a consultation?`;
      } else if (!isWithinHours) {
        return `Today is ${dateStr}! We're closed at the moment (we open at 8 AM), but we'll be back soon. Feel free to reach out!`;
      } else {
        return `Today is ${dateStr}. We're about to close for the day, but you can schedule a consultation for tomorrow or anytime this week!`;
      }
    } else {
      return `Today is ${dateStr}—that's a weekend! We're closed, but we'll be open Monday-Friday, 8 AM - 5:30 PM. Want to schedule something for a business day?`;
    }
  }

  // Day after tomorrow
  if (/day\s+after\s+tomorrow|after\s+tomorrow/.test(normalizedText)) {
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const dateStr = dayAfterTomorrow.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (isBusinessDay(dayAfterTomorrow)) {
      const responses = [
        `The day after tomorrow is ${dateStr}! 📆 Excellent timing—we're open 8 AM - 5:30 PM that day!`,
        `That would be ${dateStr}. Perfect for scheduling with us! 😊`,
        `The day after tomorrow is ${dateStr}. Great time to connect with our team!`
      ];
      return pickRandom(responses);
    } else {
      const nextBusinessDay = getNextBusinessDay(dayAfterTomorrow);
      const nextDateStr = nextBusinessDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      return `The day after tomorrow is ${dateStr}—that's outside our working hours (we're closed weekends). But ${nextDateStr} would be perfect! We're open 8 AM - 5:30 PM, Monday-Friday.`;
    }
  }

  // Day before yesterday
  if (/day\s+before\s+yesterday|before\s+yesterday/.test(normalizedText)) {
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    const dateStr = dayBeforeYesterday.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return `That was ${dateStr}! 📅 Quite a bit ago! Anything I can help you with today?`;
  }

  // Yesterday
  if (/yesterday/.test(normalizedText)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return `That was ${dateStr}! Is there something you'd like to discuss about our services today?`;
  }

  // Tomorrow
  if (/tomorrow/.test(normalizedText)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (isBusinessDay(tomorrow)) {
      const responses = [
        `Tomorrow is ${dateStr}! 📆 Great day to schedule a consultation with us (we're open 8 AM - 5:30 PM)!`,
        `That would be ${dateStr}. Perfect—we're open and ready to help! 😊`,
        `Tomorrow is ${dateStr}. That's a work day for us. Looking forward to connecting with you!`
      ];
      return pickRandom(responses);
    } else {
      const nextBusinessDay = getNextBusinessDay(tomorrow);
      const nextDateStr = nextBusinessDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      return `Tomorrow is ${dateStr}—that's a weekend for us. But we'd love to helping you! We're open Monday-Friday, 8 AM - 5:30 PM. How about ${nextDateStr} instead?`;
    }
  }

  if (/what.*time|current.*time|time\s+now|what's.*time|time\s+is/i.test(normalizedText)) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const responses = [
      `It's currently ${timeStr}. ⏰ Need to schedule a call with us? I can help you set that up!`,
      `The current time is ${timeStr}. Are you trying to book a meeting with our team?`,
      `It's ${timeStr} right now. If you're checking availability for a consultation, we're here to help! 📞`
    ];
    return pickRandom(responses);
  }

  // Fruit colors - common fruits (more flexible)
  if (/fruit.*yellow|yellow.*fruit|yellow.*color|name.*fruit|banana|mango|pineapple|lemon|papaya/i.test(normalizedText)) {
    const responses = [
      `Some yellow fruits are: **Banana**, **Mango**, **Pineapple**, **Lemon**, and **Golden Apple**! 🍌 Fun fact: We help businesses manage their "fruit" of labor by streamlining operations and maximizing growth!`,
      `Great examples are **Banana**, **Mango**, **Pineapple**, **Lemon**, and **Papaya**! 🥭 Speaking of variety, we also offer diverse services across six key business areas. Interested in learning more?`,
      `**Banana**, **Mango**, **Lemon**, and **Pineapple** are all yellow fruits! 🍋 By the way, if you need help managing your business operations with the same diversity we serve, let me know!`
    ];
    return pickRandom(responses);
  }

  // Simple math
  const mathMatch = normalizedText.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)/);
  if (mathMatch) {
    const [, num1Str, operator, num2Str] = mathMatch;
    const num1 = parseInt(num1Str);
    const num2 = parseInt(num2Str);
    let result;

    switch (operator) {
      case '+': result = num1 + num2; break;
      case '-': result = num1 - num2; break;
      case '*': result = num1 * num2; break;
      case '/': result = num2 !== 0 ? (num1 / num2).toFixed(2) : 'undefined (can\'t divide by zero)'; break;
      default: return null;
    }

    const responses = [
      `${num1} ${operator} ${num2} = **${result}** ✨ Math is my superpower! Got any questions about our services while I'm at it?`,
      `That would be **${result}**! 🧮 Fun fact: we use data and analytics to help businesses solve complex problems—kind of like math, but for your business strategy. Interested?`,
      `Quick answer: **${result}**. But if you want to talk about something more strategically important—like optimizing your business operations—I'm here for that too! 💡`
    ];
    return pickRandom(responses);
  }

  return null;
}

// Detect if a question is completely out of scope for the bot
function isQuestionOutOfScope(normalizedText) {
  // Questions about weather, sports, movies, location, geography, general knowledge etc.
  // These should NOT match knowledge base - they need critical thinking or internet search
  const tightOutOfScopePatterns = [
    /weather/i,
    /temperature/i,
    /sports/i,
    /movie/i,
    /song/i,
    /celebrity/i,
    /recipe/i,
    /cooking/i,
    /game\s+(score|result)/i,
    /stock\s+price/i,
    // Location/geography questions
    /\b(tallest|highest|lowest|oldest|largest|smallest|biggest)\s+\w+\s+(in|on)\s+(the\s+)?(world|earth|country|city|state)/i,
    /where\s+(is|are|can\s+i\s+find)\s+\w+\s+(building|mountain|lake|river|bridge|tower|pyramid|statue)/i,
    /distance\s+between/i,
    /\b(capital|country|continent|ocean|sea|island)\s+of\b/i,
    /geography|geographical/i,
    /map|location|coordinates|latitude|longitude/i,
    // General knowledge questions
    /\b(currency|money|dollar|rupee|euro|pound)\s+(of|in)\b/i,
    /\bwhat.*currency/i,
    /\bwhat.*capital\s+of/i,
    /\bpopulation\s+(of|in)\b/i,
    /\blanguage.*spoken\b/i,
    /\bofficial\s+language\b/i,
    /\bgovernment\s+system\b/i,
    /\bindependence\s+day\b/i,
    /\bflag\s+(of|in)\b/i,
    /\bvisa\s+requirement/i,
    /\btimezone\b/i,
    /\btime\s+(in|of)\s+\w+\s+\((?!today|now)/i
  ];

  return tightOutOfScopePatterns.some(pattern => pattern.test(normalizedText));
}

// Try to answer questions using critical thinking
function answerWithCriticalThinking(normalizedText) {
  // Largest/biggest things
  if (/\b(largest|biggest)\s+(country|desert|ocean|continent|island|mountain)\b/i.test(normalizedText)) {
    if (/largest.*country/i.test(normalizedText)) return "The largest country in the world by area is Russia, covering over 17 million square kilometers.";
    if (/largest.*desert/i.test(normalizedText)) return "The Antarctic Desert is technically the largest desert in the world, covering over 5.4 million square miles, though the Sahara is the largest hot desert.";
    if (/largest.*ocean/i.test(normalizedText)) return "The Pacific Ocean is the largest ocean in the world, covering about 46% of the world's ocean surface.";
    if (/largest.*continent/i.test(normalizedText)) return "Asia is the largest continent by both area and population.";
  }

  // Tallest buildings
  if (/\b(tallest|highest)\s+(building|structure|tower|skyscraper)/i.test(normalizedText)) {
    return "The Burj Khalifa in Dubai, United Arab Emirates, is currently the world's tallest building at 828 meters (2,717 feet) tall. It was completed in 2010.";
  }

  // Currency questions
  if (/\b(currency|money)\s+(of|in)\b/i.test(normalizedText)) {
    if (/india/i.test(normalizedText)) return "The currency of India is the Indian Rupee (INR), with the symbol ₹. One Rupee consists of 100 Paise.";
    if (/usa|america|united states/i.test(normalizedText)) return "The currency of the United States is the US Dollar (USD), with the symbol $.";
    if (/uk|united kingdom|england/i.test(normalizedText)) return "The currency of the United Kingdom is the British Pound Sterling (GBP), with the symbol £.";
    if (/japan/i.test(normalizedText)) return "The currency of Japan is the Japanese Yen (JPY), with the symbol ¥.";
    if (/europe|eu|euro/i.test(normalizedText)) return "The currency of the European Union is the Euro (EUR), with the symbol €.";
  }

  // Capital questions
  if (/\b(capital)\s+(of|in)\b/i.test(normalizedText)) {
    if (/india/i.test(normalizedText)) return "The capital of India is New Delhi. It is located in the northern part of India and is the seat of the Indian government.";
    if (/france/i.test(normalizedText)) return "The capital of France is Paris.";
    if (/japan/i.test(normalizedText)) return "The capital of Japan is Tokyo.";
    if (/usa|america|united states/i.test(normalizedText)) return "The capital of the United States is Washington, D.C.";
    if (/uk|united kingdom/i.test(normalizedText)) return "The capital of the United Kingdom is London.";
  }

  // Who is/was (when we have some common knowledge)
  if (/\b(who\s+(is|was|are|were))\s+(the\s+)?(president|prime\s+minister|founder|inventor|author)\s+(of|of\s+the)\b/i.test(normalizedText)) {
    // We can't reliably answer these without internet search
    return null;
  }

  // General "who is" questions - need internet search
  if (/^who\s+(is|are|was|were)\b/i.test(normalizedText)) {
    return null;
  }

  // Can't answer with critical thinking
  return null;
}

export function getWarningForOffensiveLanguage(userMessage = '', conversationHistory = [], warningCount = 0) {
  const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  // Detect type of offense to personalize the response
  const hasThreats = /fuck you|go fuck|fuck yourself|shit on|take this/.test(userMessage.toLowerCase());
  const hasInsults = /idiot|stupid|dumb|asshole|bastard|bitch|retard/.test(userMessage.toLowerCase());
  const hasSimpleSwearing = /fuck|shit|damn|hell|crap/.test(userMessage.toLowerCase());

  // Warning escalation based on frequency and severity
  if (warningCount >= 3) {
    // Final warning - strong boundary setting
    const finalWarnings = [
      "I've tried to keep this respectful, but I can't continue with this kind of language. If you have genuine questions about our services, I'm ready to help professionally. Otherwise, please reach out through our Contact Us page.",
      "I appreciate the passion, but I need to draw a line here. Disrespectful conversations aren't something I can engage with. Our team is always available if you'd like to have a professional discussion.",
      "I think we need to reset this conversation. I'm here to help, but only if we communicate respectfully. Our door is always open for genuine, professional inquiries."
    ];
    return capitalizeFirst(finalWarnings[Math.floor(Math.random() * finalWarnings.length)]);
  }

  if (warningCount >= 2) {
    // Second warning - firmer tone
    if (hasThreats) {
      return "I'm not going to engage with that kind of language. Let's keep this professional, or this conversation is over. Do you have a genuine question I can help with?";
    }
    if (hasInsults) {
      return "I understand you might be frustrated, but calling names won't help us have a productive conversation. Let's reset—what's your actual question or concern?";
    }
    return "This is the second time, and I need to be clear: I can only help if we keep things respectful. Do you have a genuine question about our services?";
  }

  if (warningCount === 1) {
    // Second offense - acknowledging this is a pattern
    if (hasThreats) {
      return "I notice you're continuing with aggressive language. I'm here to answer questions, but not to engage with threats. Can we reset and talk professionally?";
    }
    if (hasInsults) {
      return "Again with the insults? I'm genuinely here to help, but I need you to ask respectfully. What's the real question behind this?";
    }
    return "I see you're testing boundaries here. Let me be clear: I need you to communicate respectfully. Fair?";
  }

  // First warning - context-aware and dynamic
  if (hasThreats) {
    return "I'm not going to respond to threats or aggressive language. If you have a genuine question about our services, I'm happy to help—but let's keep it respectful.";
  }

  if (hasInsults) {
    const insultResponses = [
      "Calling names doesn't really help us have a conversation. I'm here to answer your questions—what's actually on your mind?",
      "I could get defensive, but instead—what's the real question you're trying to ask? I'm listening.",
      "I get that something's frustrating you, but name-calling isn't the way forward. What can I actually help you with?"
    ];
    return insultResponses[Math.floor(Math.random() * insultResponses.length)];
  }

  // General swearing - friendly but firm
  const swearingResponses = [
    "I appreciate the energy, but I'm programmed to keep things professional! 😊 Could you ask that again without the strong language?",
    "Whoa, lots of colorful language there! Let's keep it respectful and I'll give you a great answer.",
    "I notice the frustration, but let's dial back the language a bit. I'm here to help—what do you actually want to know?",
    "Ha! I love the passion, but I need you to rephrase that more professionally. Let's try again?"
  ];
  return swearingResponses[Math.floor(Math.random() * swearingResponses.length)];
}

export function getBotReply(rawText, conversationHistory = []) {
  const text = (rawText || '').trim();

  if (!text) {
    return "I'm all ears! 👂 Feel free to ask me about our services, company, how to get started, or anything else. I'm here to help!";
  }

  const normalized = text.toLowerCase();

  // TRY TO ANSWER SPECIAL QUESTIONS (date, time, math) FIRST
  const specialAnswer = answerSpecialQuestions(normalized);
  if (specialAnswer) {
    return specialAnswer;
  }

  // Reject biographical/political/factual questions before customSearch (avoid false positives)
  // These should NOT match FAQs - try critical thinking first, then internet search
  const isBiographicalQuestion = /\b(who\s+(is|are|was|were)|president|prime\s+minister|king|queen|celebrity|actor|actress|singer|inventor|author|politician|government)\b/i.test(normalized);

  // CRITICAL THINKING: Detect questions completely out of scope
  const isOutOfScope = isQuestionOutOfScope(normalized);
  if (isOutOfScope || isBiographicalQuestion) {
    // Try to answer with critical thinking first
    const criticalAnswer = answerWithCriticalThinking(normalized);
    if (criticalAnswer) {
      return criticalAnswer;
    }

    // If can't answer with critical thinking, use default responses to trigger internet search
    return pickRandom(defaultResponses);
  }

  // Build conversation context for smarter responses
  const recentContext = conversationHistory.slice(-4).map(msg => `${msg.role === 'user' ? 'Customer' : 'Assistant'}: ${msg.text}`).join('\n');
  const conversationContext = recentContext ? `\n[Recent conversation: ${recentContext}]` : '';

  // Extract what was discussed in this conversation
  const allUserMessages = conversationHistory.filter(msg => msg.role === 'user').map(msg => msg.text.toLowerCase()).join(' ');
  const mentionedServices = knowledgeBase.servicePillars.filter(p => {
    return p.services.some(s => allUserMessages.includes(s.toLowerCase())) || allUserMessages.includes(p.title.toLowerCase());
  });
  const mentionedIndustries = knowledgeBase.company.industries.filter(ind => allUserMessages.includes(ind.toLowerCase()));

  // Check if last bot message was a language warning
  const lastBotMessage = conversationHistory.length > 0
    ? conversationHistory.slice().reverse().find(msg => msg.role === 'bot')?.text.toLowerCase()
    : '';
  const lastUserMessage = conversationHistory.length > 0
    ? conversationHistory.slice().reverse().find(msg => msg.role === 'user')?.text.toLowerCase()
    : '';

  // Check how many warnings have been given in this conversation
  const warningKeywords = ['respectful', 'professional', 'rephrase', 'colorful language', 'strong language', 'strong words'];
  const warningCount = conversationHistory.filter(msg =>
    msg.role === 'bot' && warningKeywords.some(keyword => msg.text.toLowerCase().includes(keyword))
  ).length;

  // Detect if last bot message was a warning (flexible check)
  const isLastBotWarning = warningKeywords.some(keyword => lastBotMessage.includes(keyword));

  // Context-aware greeting for returning visitors
  if (conversationHistory.length > 0 && contains(normalized, /\b(hi|hello|hey)\b/i) && conversationHistory.length > 4) {
    const contextGreeting = [
      `Welcome back! 👋 It sounds like you were interested in ${mentionedServices[0]?.title || mentionedIndustries[0] || 'what we offer'}. Want to continue that conversation, or explore something else?`,
      `Great to see you again! Last time we talked about ${mentionedServices[0]?.title || 'our services'}. Anything else I can help with?`,
      `Hey again! Happy to pick up where we left off. What would you like to dive into?`
    ];
    return pickRandom(contextGreeting);
  }

  // Greeting detection - comprehensive
  if (contains(normalized, /\b(hi|hello|hey|good morning|good afternoon|good evening|greetings)\b/i) ||
    /^how\s+(are|are ya|r u|you are|do|doin|doing|is it going|go|things|you been)/i.test(normalized) ||
    /^what's up|^sup\b|^(lol|haha)/i.test(normalized)) {
    return pickRandom(greetingResponses);
  }

  // Booking/consultation - CHECK BEFORE SERVICE INQUIRY (higher priority intent)
  if (contains(normalized, /\b(book|booking|consultation|schedule|meeting|appointment|available|when|how to start|get started)\b/i)) {
    return pickRandom(bookingResponses);
  }

  // Specific service lookup (e.g., Procurement, CMS Integration) - prioritize over generic intent buckets
  const specificServiceMatch = getSpecificServiceMatch(normalized);
  if (specificServiceMatch) {
    const { pillar, service } = specificServiceMatch;
    const serviceDescription = knowledgeBase.serviceDescriptions[service] || `${service} is part of our ${pillar.title} offerings.`;

    const specificServiceResponses = [
      `Great question! **${service}** is exactly what we do. ${serviceDescription}\n\nWould you like to discuss how this can work for your organization? You can 'Schedule Free Consultation' to talk with our experts about your specific needs.`,
      `Absolutely! **${service}** is a core strength of ours. ${serviceDescription}\n\nReady to explore how we can help? 'Schedule Free Consultation' is the perfect next step to discuss your requirements.`,
      `You're in the right place. We specialize in **${service}**. ${serviceDescription}\n\nInterested in learning more about implementation? Let's set up a conversation—click 'Schedule Free Consultation' and we'll walk you through options.`
    ];
    return pickRandom(specificServiceResponses);
  }

  // Pillar-level keyword match (e.g., "data management" → "Data & Reporting")
  const specificPillarMatch = getSpecificPillarMatch(normalized);
  if (specificPillarMatch) {
    const conversationalPillar = [
      `Great question! **${specificPillarMatch.title}** is exactly what we specialize in. ${specificPillarMatch.summary} We can help with things like ${specificPillarMatch.services.slice(0, 4).join(', ')}, and more.\n\nWould you like to learn more about any specific area? You can also 'Schedule Free Consultation' to discuss your needs.`,
      `Absolutely! **${specificPillarMatch.title}** is a core strength of ours. ${specificPillarMatch.summary}\n\nWe work on everything from ${specificPillarMatch.services[0]} to ${specificPillarMatch.services[Math.floor(specificPillarMatch.services.length / 2)]}, depending on what your organization needs. Ready to explore? 'Schedule Free Consultation' to chat with our experts.`,
      `Perfect! **${specificPillarMatch.title}** is right in our wheelhouse. ${specificPillarMatch.summary}\n\nInterested in diving deeper into how we can help? Let's set up a conversation—click 'Schedule Free Consultation' and we'll walk you through options.`
    ];
    return pickRandom(conversationalPillar);
  }

  // Service inquiry - conversational approach
  if (contains(normalized, /\b(service|services|what do you|offer|you do|what can|capability|capabilities)\b/i)) {
    const conversationalIntros = [
      "Absolutely! Let me give you a quick overview of what we do. We help organizations across six key areas:",
      "Great question! Here's the thing—we specialize in a lot of different areas. We focus on:",
      "Perfect! We've built our business around six main pillars. Let me walk you through them:"
    ];

    const pillarDescriptions = knowledgeBase.servicePillars.map((p) => {
      return `**${p.title}** — We help with things like ${p.services.slice(0, 3).join(', ')}, and more. Basically, ${p.summary.toLowerCase()}`;
    }).join('\n\n');

    const conversationalOutros = [
      "So, do any of these areas sound relevant to what you're working on? I'd love to dive deeper into whichever interests you!",
      "Curious about any of these in particular? I can explain more about how we'd approach it for your situation.",
      "Which of these sounds most aligned with what you're trying to solve? Let me know and I can get more specific!"
    ];

    const intro = pickRandom(conversationalIntros);
    const outro = pickRandom(conversationalOutros);
    return `${intro}\n\n${pillarDescriptions}\n\n${outro}`;
  }

  // Contact/reach out
  if (contains(normalized, /\b(contact|email|call|reach|phone|how to contact)\b/i)) {
    return pickRandom(contactResponses);
  }

  // Company/about
  if (contains(normalized, /(about\s+you|about\s+your\s+company|about\s+the\s+company|who\s+are\s+you|company|dataverse|your\s+name|background|history)/i)) {
    return pickRandom(companyResponses);
  }

  // Industries/who you serve
  if (contains(normalized, /\b(industry|industries|startup|enterprise|public|private|multinational|sme|who do you|serve|customer|clients|organizations)\b/i)) {
    const conversationalIndustry = [
      "Absolutely! We work with all kinds of organizations, from scrappy startups to massive enterprises. The thing is, we don't believe in one-size-fits-all solutions. Whether you're a startup trying to scale fast, an SME building sustainable growth, or an enterprise managing complex operations—we've got expertise there. We also work with public sector organizations, private companies, and multinational operations. What type are you, and what's your main goal right now?",
      "Great question! Our sweet spot is working with diverse organizations. We've got deep experience with startups who need help scaling efficiently, SMEs optimizing their operations, and large enterprises tackling complex problems. Public or private sector, multinational or regional—we bring the same commitment to results. So, what kind of organization are you, and what's keeping you up at night? 😄",
      "You know, that's what I love about what we do—we work with everyone! Startups getting off the ground, SMEs building something real, enterprises managing scale, public organizations managing compliance, multinational teams coordinating across borders. The reason we succeed across all of these is because we listen first, then tailor our approach. What's your organization like?"
    ];
    return pickRandom(conversationalIndustry);
  }

  // Challenges
  if (contains(normalized, /\b(challenge|problem|issue|struggle|difficult|pain|help with|solve|need)\b/i)) {
    const conversationalChallenge = [
      "I totally get it. You're facing real challenges—and honestly, pretty much every organization we work with comes to us because of similar pain points. The good news? We've successfully helped teams overcome exactly these kinds of issues. Instead of just telling you we can help, let me ask: what's the ONE thing that's affecting your business the most right now? I can suggest the best approach for that.",
      "Yeah, those are tough situations. But here's what I've learned: most of these challenges are fixable with the right partner and strategy. We specialize in turning these obstacles into competitive advantages, actually. So let's focus: what's your biggest frustration right now? Is it operational inefficiency, scaling issues, data problems, or something else?",
      "I hear the frustration. What's interesting is that almost every organization we work with started right where you are—facing challenges that felt overwhelming. We've built our entire business around helping teams solve exactly this stuff. But to give you the best advice, help me understand: what's the core problem you're trying to solve?"
    ];
    return pickRandom(conversationalChallenge);
  }

  // Pricing/cost
  if (contains(normalized, /\b(price|pricing|cost|free|expensive|how much|rate|budget)\b/i)) {
    return "Great question! 💰 Pricing varies based on the scope of services and your specific needs. Since every organization is unique, we provide custom quotes. Want to chat about your needs? 'Schedule Free Consultation' is the perfect start—no obligation!";
  }

  // Performance/results
  if (contains(normalized, /\b(result|results|success|effectiveness|track record|proven|case study|example)\b/i)) {
    return "We're proud of our track record helping organizations streamline operations, accelerate growth, and make smarter decisions. 📈 Every client is different, so results vary—but we're committed to measurable impact. Want to hear more about how we've helped others in your space? Let's chat!";
  }

  // Experience/expertise
  if (contains(normalized, /\b(experience|expertise|expert|team|how long|how many years|qualifications|credentials)\b/i)) {
    return "Great question! We bring deep expertise across consulting, operations, data, and digital services. Our team has worked with startups, SMEs, and enterprises across industries. We combine strategic thinking with practical execution to deliver real results. Want to know more about a specific area?";
  }

  // Testimonials/proof
  if (contains(normalized, /\b(testimonial|review|rating|feedback|what people say|client feedback)\b/i)) {
    return "We love working with our clients, and they love the results we deliver together. Every project is an opportunity to prove our value. If you'd like to hear directly from organizations we've helped, our team can share success stories that match your situation. How about scheduling a conversation?";
  }

  // Handle follow-ups to warning messages (AFTER all intent matching)
  if (isLastBotWarning) {
    // Check if user is refusing or being defiant
    if (contains(lastUserMessage, /\b(no|won't|wont|refuse|never|don't|dont|nope|nah|fuck|hell|idiot|stupid)\b/i)) {
      // Multiple warnings without compliance
      if (warningCount >= 2) {
        const finalResponses = [
          "I understand you're frustrated, but I can't continue conversations with disrespectful language. If you'd like to have a genuine conversation about our services, I'm here! Otherwise, feel free to reach out when you're ready. 🤝",
          "Look, I've tried to be accommodating, but I need to maintain professional standards. I'm still happy to help if you'd like to chat respectfully. Otherwise, our team is always available through the Contact Us page.",
          "I appreciate your honesty, but I can only help if we keep things respectful. No hard feelings—our team is always ready to assist when you're ready for a proper conversation. 💙"
        ];
        return pickRandom(finalResponses);
      }

      // First refusal - give another chance
      const refusalResponses = [
        "I understand this might be frustrating, but I have to maintain respectful conversations. If you'd like to continue, I'm here to help with any genuine questions about our services. No pressure! 😊",
        "I respect your feelings, but I can only continue if we keep things professional. I'm still happy to help you learn about Dataverse Dynamics whenever you're ready!",
        "That's totally okay! But I'm designed to keep conversations respectful. Feel free to reach out anytime you'd like genuine information about our services. We're here to help! 💙",
        "I get it—sometimes the tone gets heated. But hey, I'm still here if you have real questions about what we do. No judgment, just here to help! 🤝"
      ];
      return pickRandom(refusalResponses);
    }

    const isAcknowledgement = /^(ok|okay|alright|sorry|my bad|understood|got it|noted|thanks|thank you|fine|fair)\b/i.test(normalized);
    if (isAcknowledgement) {
      const acceptanceResponses = [
        "Thank you for that! 😊 So, what can I help you with today? Feel free to ask about our services, company, or how to get started.",
        "Appreciate it! Let's move forward. What would you like to know about Dataverse Dynamics?",
        "Great! Looking forward to talking. What brings you here today?",
        "Perfect! So, what can I help you with? Ask away! 💬"
      ];
      return pickRandom(acceptanceResponses);
    }
  }

  // Use custom search on knowledge base
  const results = customSearch(text, docs);
  if (results.length && (results[0].score ?? 1) <= 0.46) {
    const match = results[0].item;

    if (match.type === 'faq') {
      const conversationalFAQ = [
        `Great question! Here's what I can tell you: ${match.content} \n\nHave any other questions I can help with?`,
        `You know, a lot of people ask this. Here's how we approach it: ${match.content} \n\nDoes that help clarify things?`,
        `I'm glad you asked! ${match.content} \n\nWant to know more about something specific?`
      ];
      return pickRandom(conversationalFAQ);
    }

    if (match.type === 'service') {
      // Find the full pillar info for context
      const serviceName = match.title;
      const pillar = knowledgeBase.servicePillars.find(p => p.services.includes(serviceName));
      const serviceDescription = knowledgeBase.serviceDescriptions[serviceName];

      if (pillar && serviceDescription) {
        const conversationalService = [
          `Great question! **${serviceName}** is exactly what we do. ${serviceDescription}\n\nWould you like to discuss how this can work for your organization? 'Schedule Free Consultation' to talk with our experts about your specific needs.`,
          `Absolutely! **${serviceName}** is a core strength of ours. ${serviceDescription}\n\nReady to explore how we can help? 'Schedule Free Consultation' is the perfect next step.`,
          `You're in the right place. We specialize in **${serviceName}**. ${serviceDescription}\n\nInterested in learning more? Let's set up a conversation—click 'Schedule Free Consultation' and we'll walk you through options.`
        ];
        return pickRandom(conversationalService);
      }

      if (pillar) {
        const conversationalService = [
          `So you're interested in **${serviceName}**—that's one of our core strengths! It's part of our **${pillar.title}** offerings. Here's what we typically do: ${pillar.summary}\n\nWould you like to 'Schedule Free Consultation' to discuss how we can help?`,
          `Great choice! **${serviceName}** falls under our **${pillar.title}** services. We help organizations get more value in this area.\n\nReady to talk specifics? 'Schedule Free Consultation' with our team.`,
          `Love that you asked about **${serviceName}**! It's a big part of what we do in **${pillar.title}**. \n\nInterested in exploring this further? Let's set up a time—click 'Schedule Free Consultation'.`
        ];
        return pickRandom(conversationalService);
      }

      return `Ah, **${match.title}**! That's definitely something we specialize in. ${match.content}\n\nLet's discuss how we can help—'Schedule Free Consultation' to connect with our experts.`;
    }

    if (match.type === 'pillar') {
      const pillarInfo = knowledgeBase.servicePillars.find(p => p.title === match.title);
      if (pillarInfo) {
        const conversationalPillar = [
          `Excellent! **${match.title}** is one of my favorite areas to talk about. Honestly, ${pillarInfo.summary} We help with things like ${pillarInfo.services.slice(0, 4).join(', ')}, and a bunch more. \n\nWhere do you think you need the most support?`,
          `**${match.title}**—that's core to what we do! Think of it this way: ${pillarInfo.summary} We work on everything from ${pillarInfo.services[0]} to ${pillarInfo.services[pillarInfo.services.length - 1]}, depending on what your organization needs. \n\nWhich of these resonates most with you?`,
          `Great area! **${match.title}** is where we help organizations really transform. ${pillarInfo.summary} We handle ${pillarInfo.services.slice(0, 3).join(', ')}, and much more depending on what your organization is dealing with. \n\nWhat's your biggest pain point in this area?`
        ];
        return pickRandom(conversationalPillar);
      }
      return `**${match.title}** is a crucial area! ${match.content} \n\nTell me more about what you're trying to achieve—I can recommend the best approach for your situation.`;
    }

    return `${match.title}: ${match.content}`;
  }

  // Default response - context-aware if conversation has history
  if (conversationHistory.length > 2) {
    const contextAwareDefault = [
      `That's a great question! Based on what you've mentioned, it sounds like you might be interested in one of our core areas—${mentionedServices[0]?.title || 'our comprehensive services'}. Want me to dive deeper into that, or explore something else?`,
      `I love your curiosity! 😊 While my knowledge base might not cover that exact question, I can definitely help you with our services, company info, or getting you connected with our team. What would be most helpful?`,
      `You know, that's something our consulting team would love to discuss with you directly. In the meantime, is there anything about our services or company I can explain?`
    ];
    return pickRandom(contextAwareDefault);
  }

  // Default response - helpful and encouraging
  return pickRandom(defaultResponses);
}

// Check if a question should trigger an internet search
export function shouldSearchInternet(normalizedText, conversationHistory = []) {
  // Don't search for greetings, small talk, or very short questions
  const greetingPatterns = [
    /^(hi|hello|hey|bye|ok|thanks|thank you|good bye|goodbye)$/i,
    /^how\s+(are|are ya|r u|you are|do|doin|doing|is it going|go|things|you been)\b/i,
    /^what's up/i,
    /^sup\b/i,
    /^(lol|haha|nice|cool|awesome|great|good|okay)\b/i,
    /^(you|you there|you there\?|anyone here)/i,
    /^(fine|good|great|ok|alright|well|not bad|could be better)\b/i
  ];

  if (greetingPatterns.some(pattern => pattern.test(normalizedText))) {
    return false;
  }

  // Don't search for questions we DEFINITELY handle well (knowledge base covers these)
  const noSearchPatterns = [
    /service|company|about|consult|booking|schedule|contact|industry|organization|business|challenge/i,
    /pricing|price|cost|free|expertise|experience|background|team/i,
    /faq|frequently|question|day|date|time|math|fruit|color/i,
    /when|which|how do|can you/i  // Removed 'name' - 'who is' questions should be searchable
  ];

  const shouldSkipSearch = noSearchPatterns.some(pattern => pattern.test(normalizedText));
  if (shouldSkipSearch) {
    return false;
  }

  // Allow searches for: who is/was, what is/are, general facts/people/events
  // If they asked something specific that's not in our knowledge base, search it
  return true;
}