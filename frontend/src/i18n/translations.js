export const translations = {
  en: {
    header: {
      title: 'Gold Forecaster',
      subtitle: 'XAU/USD · Gold Futures (GC=F)',
      subtitleShort: 'XAU/USD',
      updated: 'Updated {{time}}',
      refreshPrice: 'Refresh price',
    },
    chart: {
      title: 'Price History & Forecasts',
      subtitle: '(90 days + model projections)',
      today: 'Today',
      close: 'Close',
      forecast: 'Forecast',
      srCaption: 'XAU/USD gold price history over the past 90 days with AI-generated price forecasts',
      srLabel: 'Gold price history and forecast chart',
    },
    forecastGrid: {
      title: 'Price Forecasts',
      showBreakdown: 'Click a card to see model breakdown',
      hideBreakdown: 'Click any card to hide breakdown',
      updated: 'Updated {{time}}',
      ariaLabel: 'Gold Price Forecasts',
    },
    forecastCard: {
      confidence: '95% confidence range',
      blended: 'Blended',
    },
    technical: {
      title: 'Technical Analysis',
      titleTooltip:
        'Price-based indicators that help gauge trend direction, momentum, and whether gold may be overbought or oversold. All signals are combined into the overall rating.',
      overall: 'Overall:',
      movingAverages: 'Moving Averages',
      movingAveragesTooltip:
        'The average price over a given number of days. Price above the average suggests an uptrend; below suggests a downtrend. EMA reacts faster by weighting recent prices more.',
      above: 'Above ▲',
      below: 'Below ▼',
      rsi: 'RSI (14)',
      rsiTooltip:
        'Measures momentum on a 0–100 scale. Below 30 means oversold — price may bounce. Above 70 means overbought — price may pull back. Between 30–70 is neutral.',
      oversold: 'Oversold 30',
      overbought: '70 Overbought',
      macd: 'MACD (12, 26, 9)',
      macdTooltip:
        'Tracks momentum by comparing two moving averages. When the histogram turns positive, it signals building upward momentum. Negative means downward pressure.',
      macdLine: 'MACD Line',
      signalLine: 'Signal Line',
      histogram: 'Histogram',
      bollingerBands: 'Bollinger Bands (20, 2)',
      bollingerTooltip:
        'Volatility bands around a 20-day average. Price near the upper band may be stretched; near the lower band may be cheap. %B shows where price sits between the two bands.',
      upper: 'Upper',
      middle: 'Middle (MA20)',
      lower: 'Lower',
      moreInfo: 'More info',
    },
    ai: {
      title: 'AI Market Analysis',
      poweredBy: 'powered by Claude',
      unavailable: 'AI analysis unavailable',
    },
    institutional: {
      title: 'Institutional Forecasts',
      unavailable:
        'AI-powered institutional analysis unavailable — ANTHROPIC_API_KEY not configured.',
      bullish: '{{n}} bullish',
      neutral: '{{n}} neutral',
      bearish: '{{n}} bearish',
    },
    app: {
      refresh: 'Refresh Forecasts',
      refreshing: 'Refreshing forecasts...',
      lastGenerated: 'Last generated: {{time}}',
      priceChart: 'Price Chart',
      marketAnalysis: 'Market Analysis',
      institutionalForecasts: 'Institutional Forecasts',
    },
    disclaimer: 'All forecasts are speculative and not financial advice.',
    models: {
      arima: 'ARIMA',
      trend: 'Trend',
      technical: 'Technical',
    },
    switchLang: 'عربي',
  },

  ar: {
    header: {
      title: 'توقعات الذهب',
      subtitle: 'XAU/USD · عقود الذهب الآجلة (GC=F)',
      subtitleShort: 'XAU/USD',
      updated: 'آخر تحديث {{time}}',
      refreshPrice: 'تحديث السعر',
    },
    chart: {
      title: 'تاريخ الأسعار والتوقعات',
      subtitle: '(90 يومًا + توقعات النماذج)',
      today: 'اليوم',
      close: 'الإغلاق',
      forecast: 'التوقع',
      srCaption: 'تاريخ سعر الذهب XAU/USD خلال الـ 90 يومًا الماضية مع توقعات الأسعار المُولَّدة بالذكاء الاصطناعي',
      srLabel: 'مخطط تاريخ سعر الذهب والتوقعات',
    },
    forecastGrid: {
      title: 'توقعات الأسعار',
      showBreakdown: 'انقر على بطاقة لعرض تفاصيل النموذج',
      hideBreakdown: 'انقر على أي بطاقة لإخفاء التفاصيل',
      updated: 'تم التحديث {{time}}',
      ariaLabel: 'توقعات سعر الذهب',
    },
    forecastCard: {
      confidence: 'نطاق الثقة 95٪',
      blended: 'المزيج',
    },
    technical: {
      title: 'التحليل الفني',
      titleTooltip:
        'مؤشرات مبنية على الأسعار تساعد في قياس اتجاه الترند والزخم ومدى ذروة الشراء أو البيع. تُجمَع كل الإشارات في التقييم الإجمالي.',
      overall: 'الإجمالي:',
      movingAverages: 'المتوسطات المتحركة',
      movingAveragesTooltip:
        'متوسط السعر على مدى عدد معين من الأيام. السعر فوق المتوسط يشير إلى اتجاه صاعد؛ دونه يشير إلى اتجاه هابط. تتفاعل EMA بشكل أسرع بإعطاء وزن أكبر للأسعار الحديثة.',
      above: 'أعلى ▲',
      below: 'أدنى ▼',
      rsi: 'مؤشر RSI (14)',
      rsiTooltip:
        'يقيس الزخم على مقياس من 0 إلى 100. أقل من 30 يعني ذروة البيع — قد يرتد السعر. فوق 70 يعني ذروة الشراء — قد يتراجع السعر. بين 30–70 محايد.',
      oversold: 'ذروة بيع 30',
      overbought: '70 ذروة شراء',
      macd: 'ماكد (12، 26، 9)',
      macdTooltip:
        'يتتبع الزخم بمقارنة متوسطين متحركين. حين يصبح المدرج البياني موجبًا يشير إلى تصاعد الزخم الصعودي. السلبي يعني ضغطًا هبوطيًا.',
      macdLine: 'خط الماكد',
      signalLine: 'خط الإشارة',
      histogram: 'المدرج البياني',
      bollingerBands: 'بولينجر باندز (20، 2)',
      bollingerTooltip:
        'نطاقات تذبذب حول متوسط 20 يومًا. السعر قرب النطاق العلوي قد يكون مبالغًا؛ قرب الأدنى قد يكون رخيصًا. %B يُظهر موقع السعر بين النطاقين.',
      upper: 'العلوي',
      middle: 'الأوسط (MA20)',
      lower: 'السفلي',
      moreInfo: 'مزيد من المعلومات',
    },
    ai: {
      title: 'تحليل السوق بالذكاء الاصطناعي',
      poweredBy: 'مدعوم بـ Claude',
      unavailable: 'التحليل بالذكاء الاصطناعي غير متاح',
    },
    institutional: {
      title: 'توقعات المؤسسات',
      unavailable:
        'التحليل المؤسسي بالذكاء الاصطناعي غير متاح — لم يتم تكوين ANTHROPIC_API_KEY.',
      bullish: '{{n}} صاعد',
      neutral: '{{n}} محايد',
      bearish: '{{n}} هابط',
    },
    app: {
      refresh: 'تحديث التوقعات',
      refreshing: 'جارٍ تحديث التوقعات...',
      lastGenerated: 'آخر إنشاء: {{time}}',
      priceChart: 'مخطط الأسعار',
      marketAnalysis: 'تحليل السوق',
      institutionalForecasts: 'توقعات المؤسسات',
    },
    disclaimer: 'جميع التوقعات تخمينية وليست نصيحة مالية.',
    models: {
      arima: 'أريما',
      trend: 'الاتجاه',
      technical: 'فني',
    },
    switchLang: 'English',
  },
}
