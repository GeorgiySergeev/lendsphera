export const starterHtml = `<section class="py-16 px-6 bg-white dark:bg-slate-900">
  <div class="max-w-4xl mx-auto text-center">
    <h2 class="text-4xl font-bold text-slate-900 dark:text-white mb-4">
      Your headline here
    </h2>
    <p class="text-xl text-slate-600 dark:text-slate-300 mb-8">
      Supporting text goes here. Add a short description or compelling subheadline.
    </p>
    <a href="#" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
      Call to action
    </a>
  </div>
</section>`;

export const quickStartTemplates = [
  {
    id: 'hero',
    label: 'Hero',
    html: `<section class="py-24 px-6 bg-slate-50 dark:bg-slate-950">
  <div class="max-w-5xl mx-auto text-center">
    <h1 class="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
      Build something amazing
    </h1>
    <p class="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
      Start building your next project with this clean and modern hero section.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <button class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg">Get Started</button>
      <button class="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 font-semibold px-8 py-3 rounded-lg">Documentation</button>
    </div>
  </div>
</section>`
  },
  {
    id: 'cta',
    label: 'CTA',
    html: `<section class="py-16 px-6">
  <div class="max-w-4xl mx-auto bg-blue-600 rounded-2xl p-8 md:p-12 text-center text-white">
    <h2 class="text-3xl font-bold mb-4">Ready to get started?</h2>
    <p class="text-blue-100 mb-8 max-w-xl mx-auto">Join thousands of users who are already building with our platform.</p>
    <button class="bg-white text-blue-600 font-bold px-8 py-3 rounded-lg hover:bg-blue-50 transition">
      Create Free Account
    </button>
  </div>
</section>`
  },
  {
    id: 'form',
    label: 'Form',
    html: `<section class="py-16 px-6 bg-white dark:bg-slate-900">
  <div class="max-w-md mx-auto">
    <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">Contact Us</h3>
    <form class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
        <input type="email" class="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white" placeholder="you@example.com">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
        <textarea rows="4" class="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white" placeholder="How can we help?"></textarea>
      </div>
      <button type="submit" class="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700">Send Message</button>
    </form>
  </div>
</section>`
  },
  {
    id: 'stats',
    label: 'Stats',
    html: `<section class="py-16 px-6 border-y border-slate-100 dark:border-slate-800">
  <div class="max-w-5xl mx-auto">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      <div>
        <div class="text-4xl font-bold text-blue-600 mb-2">10k+</div>
        <div class="text-sm text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wider">Customers</div>
      </div>
      <div>
        <div class="text-4xl font-bold text-blue-600 mb-2">99.9%</div>
        <div class="text-sm text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wider">Uptime</div>
      </div>
      <div>
        <div class="text-4xl font-bold text-blue-600 mb-2">5M+</div>
        <div class="text-sm text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wider">Downloads</div>
      </div>
      <div>
        <div class="text-4xl font-bold text-blue-600 mb-2">24/7</div>
        <div class="text-sm text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wider">Support</div>
      </div>
    </div>
  </div>
</section>`
  },
  {
    id: 'testimonial',
    label: 'Testimonial',
    html: `<section class="py-16 px-6 bg-slate-50 dark:bg-slate-950">
  <div class="max-w-3xl mx-auto text-center">
    <div class="text-blue-600 mb-6">
      <svg class="w-10 h-10 mx-auto" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z"></path>
      </svg>
    </div>
    <blockquote class="text-2xl font-medium text-slate-900 dark:text-white mb-8">
      "This product completely transformed how we work. The intuitive interface and powerful features saved us countless hours."
    </blockquote>
    <div>
      <div class="font-bold text-slate-900 dark:text-white">Jane Doe</div>
      <div class="text-slate-600 dark:text-slate-400 text-sm">CEO, TechCorp</div>
    </div>
  </div>
</section>`
  },
  {
    id: 'banner',
    label: 'Banner',
    html: `<div class="bg-blue-600 text-white px-4 py-3 sm:px-6 lg:px-8">
  <div class="flex items-center justify-between flex-wrap gap-2">
    <div class="flex-1 flex items-center min-w-0">
      <span class="flex p-2 rounded-lg bg-blue-800">
        <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      </span>
      <p class="ml-3 font-medium text-sm truncate">
        <span class="md:hidden">We announced a new product!</span>
        <span class="hidden md:inline">Big news! We're excited to announce a brand new product.</span>
      </p>
    </div>
    <div class="order-3 mt-2 shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
      <a href="#" class="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50">
        Learn more
      </a>
    </div>
  </div>
</div>`
  }
];
