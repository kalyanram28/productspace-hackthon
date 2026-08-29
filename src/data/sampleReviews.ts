/**
 * ~36 realistic mock reviews so the dashboard is demo-ready on first load.
 *
 * Analysis (sentiment / issue / severity) and the initial draft replies are
 * derived at module load with the offline rule-based classifier, so the app
 * renders instantly with zero API calls. Use the "Re-analyze with AI" and
 * "Regenerate" actions in the UI to run the real LLM pass.
 */
import {
  fallbackAnalyze,
  fallbackDraft,
  type Platform,
  type Review,
} from "@/lib/reviews";

interface RawReview {
  platform: Platform;
  reviewer: string;
  rating: number;
  text: string;
  date: string;
}

const RAW: RawReview[] = [
  { platform: "Google", reviewer: "Marcus Bell", rating: 1, text: "Waited 55 minutes for two mains and nobody checked on us. When the food finally came the pasta was cold. Completely unacceptable on a Tuesday night.", date: "2026-08-26" },
  { platform: "Yelp", reviewer: "Priya Raman", rating: 1, text: "I got food poisoning after the shrimp tacos and spent the night sick. Please check your kitchen, someone else is going to get hurt.", date: "2026-08-25" },
  { platform: "Google", reviewer: "Elena Cruz", rating: 5, text: "Absolutely lovely evening. Our server Dani was warm and attentive and the short rib was the best I've had in the city.", date: "2026-08-25" },
  { platform: "Facebook", reviewer: "Tom Whitaker", rating: 2, text: "Charged twice for the same round of drinks and the manager argued with me about the receipt before finally refunding it.", date: "2026-08-24" },
  { platform: "Google", reviewer: "Aisha Noor", rating: 4, text: "Great food and nice patio. Slightly slow service when it got busy but the team was friendly about it.", date: "2026-08-24" },
  { platform: "Yelp", reviewer: "Derek Olsen", rating: 1, text: "The bathroom was filthy, there was hair in my glass, and the floor was sticky. Genuinely unhygienic.", date: "2026-08-23" },
  { platform: "Google", reviewer: "Hannah Liu", rating: 3, text: "Food was fine, nothing memorable. The music was so loud we had to shout across the table.", date: "2026-08-23" },
  { platform: "Google", reviewer: "Samuel Adeyemi", rating: 5, text: "Second time this month. Consistently excellent, and they remembered my order. Highly recommend the lamb.", date: "2026-08-22" },
  { platform: "Facebook", reviewer: "Grace Mendez", rating: 2, text: "Our reservation was given away even though we arrived on time. We waited 30 minutes for a table we had booked a week earlier.", date: "2026-08-22" },
  { platform: "Yelp", reviewer: "Nathan Poole", rating: 1, text: "Staff were rude when we asked to move tables. The host rolled her eyes at us. Won't be back.", date: "2026-08-21" },
  { platform: "Google", reviewer: "Chloe Barrett", rating: 4, text: "Lovely brunch, the pancakes were perfect. Took a while to get the bill at the end.", date: "2026-08-21" },
  { platform: "Google", reviewer: "Victor Ivanov", rating: 2, text: "Steak came out raw in the middle and the replacement took another 25 minutes. Kitchen seems overwhelmed.", date: "2026-08-20" },
  { platform: "Yelp", reviewer: "Maya Fitzgerald", rating: 5, text: "Best neighbourhood spot. Cocktails are creative and the staff genuinely care. Perfect birthday dinner.", date: "2026-08-20" },
  { platform: "Facebook", reviewer: "Owen Clarke", rating: 3, text: "Decent value but the delivery order was missing a side and no one answered the phone.", date: "2026-08-19" },
  { platform: "Google", reviewer: "Isabelle Fournier", rating: 1, text: "My daughter has a nut allergy, we told the server twice, and the dessert still came with almond crumble. This is a safety issue.", date: "2026-08-19" },
  { platform: "Google", reviewer: "Ryan Doyle", rating: 4, text: "Solid food, good beer list. Parking around the block is a pain but that's not really on them.", date: "2026-08-18" },
  { platform: "Yelp", reviewer: "Sofia Marchetti", rating: 2, text: "Slow service from start to finish. Forty minutes before anyone took our drink order.", date: "2026-08-18" },
  { platform: "Google", reviewer: "Daniel Kang", rating: 5, text: "Fast, friendly, and the fried chicken sandwich is unreal. In and out in 30 minutes on my lunch break.", date: "2026-08-17" },
  { platform: "Facebook", reviewer: "Rebecca Stone", rating: 3, text: "Nice interior, food was a bit bland for the price. Service was attentive though.", date: "2026-08-17" },
  { platform: "Google", reviewer: "Ahmed Farouk", rating: 1, text: "Bill was 20 dollars more than the menu prices. When I asked, I was told the menu is out of date. Feels dishonest.", date: "2026-08-16" },
  { platform: "Yelp", reviewer: "Lucy Hargrove", rating: 5, text: "The team handled our group of 14 beautifully. Everything came out at once and it was all hot.", date: "2026-08-15" },
  { platform: "Google", reviewer: "Peter Nowak", rating: 2, text: "Tables weren't wiped, menus were sticky. Food was okay but I couldn't get past how dirty it felt.", date: "2026-08-15" },
  { platform: "Google", reviewer: "Zoe Whitfield", rating: 4, text: "Really good coffee and pastries. Gets very noisy after 10am.", date: "2026-08-14" },
  { platform: "Facebook", reviewer: "Julian Reyes", rating: 1, text: "Waited an hour for a takeaway order that was quoted 15 minutes, then it was the wrong order entirely.", date: "2026-08-14" },
  { platform: "Yelp", reviewer: "Nina Petrov", rating: 3, text: "Average. The salad was fresh, the burger was overcooked. Staff friendly enough.", date: "2026-08-13" },
  { platform: "Google", reviewer: "Colin Murray", rating: 5, text: "Been coming for six years. Still the friendliest staff in town and portions are generous.", date: "2026-08-12" },
  { platform: "Google", reviewer: "Farah Haddad", rating: 2, text: "Server seemed annoyed we ordered separately and sighed at the table. Food was decent.", date: "2026-08-12" },
  { platform: "Other", reviewer: "Greg Tan", rating: 1, text: "Saw a cockroach near the drinks station. Told the staff and they shrugged. Reporting this.", date: "2026-08-11" },
  { platform: "Google", reviewer: "Amelia Ross", rating: 4, text: "Great date-night spot, though we waited 20 minutes past our booking time.", date: "2026-08-11" },
  { platform: "Yelp", reviewer: "Jonas Berg", rating: 5, text: "Superb tasting menu and the sommelier's pairings were spot on. Worth every penny.", date: "2026-08-10" },
  { platform: "Facebook", reviewer: "Tanya Brooks", rating: 2, text: "Food arrived lukewarm and the fries were stale. Sent it back and got the same plate reheated.", date: "2026-08-09" },
  { platform: "Google", reviewer: "Michael Duarte", rating: 3, text: "Fine for a quick lunch. Slow at the counter, only one person on register.", date: "2026-08-08" },
  { platform: "Google", reviewer: "Sarah Kelleher", rating: 5, text: "The staff went out of their way to accommodate my gluten-free order. Felt genuinely looked after.", date: "2026-08-07" },
  { platform: "Yelp", reviewer: "Bruno Salas", rating: 1, text: "Rude bartender, ignored me for 15 minutes while serving people who came after. Never again.", date: "2026-08-06" },
  { platform: "Google", reviewer: "Katie Lawson", rating: 4, text: "Cosy place, good service, the dessert menu is small but excellent.", date: "2026-08-05" },
  { platform: "Facebook", reviewer: "Andre Miles", rating: 2, text: "Booked for an anniversary, no record of the reservation and we were seated by the kitchen door.", date: "2026-08-04" },
];

export const sampleReviews: Review[] = RAW.map((r, i) => {
  const analysis = fallbackAnalyze(r);
  return {
    id: `sample-${i + 1}`,
    ...r,
    ...analysis,
    draft: fallbackDraft({ reviewer: r.reviewer, rating: r.rating, issue: analysis.issue }),
    resolved: false,
    fallback: true,
  };
});
