# Brew and Bakehouse

Specialty coffee and same day patisserie in Yaba, Lagos.
Order ahead, skip the line, pickup in minutes.

Brew and Bakehouse is a static website for a coffee and pastry shop at 14 Herbert Macaulay Way, Yaba Lagos. It has no server and no database. Everything runs in the browser. Guests can browse the menu, build a pickup bag, checkout in seconds, or send the same order through WhatsApp.


## Features

### Order and menu

* 45 items across 6 categories on `order.html`: espresso, signatures, cold, bakery, tea, plates
* Instant search with top 6 suggestions plus full grid filtering
* Category filters with live counts per section
* Sold out support via one list in `js/script.js`
* Sticky bag bar that appears only when the bag has items

### Bag and checkout

* Pickup bag saved in the browser under `bb_cart_v2`, so reloads keep the bag
* Checkout on `checkout.html` with name, phone, email and pickup time
* Pickup time guardrails: shop hours plus 15 minutes lead time
* Pickup or Delivery toggle with zones, fees and free delivery threshold
* Live queue estimate under the totals
* Pay on pickup or delivery
* Last order memory with one tap Order again
* Loyalty stamps with treat unlocked every 9th order
* WhatsApp lane that composes the live bag plus form details into a chat message

### Office Box for teams

* One tap box for teams of 5 or more on `order.html#office-box`
* Stepper from 5 to 50 heads, coffee plus pastry estimate in Naira
* Team treat: 10 or more heads unlocks 5 percent off note to honor at pickup

### Visit

* Address, hours and map on `find-us.html`
* Hours: Mon to Fri 7am to 7pm • Sat 8am to 7pm • Sun 9am to 5pm
* Floating WhatsApp chat button on every page

## Pages

* `index.html` : Home. Hero, house standard, signatures, craft stats, story teaser, guest notes, team band
* `our-story.html` : About. Story, roast plus bake plus brew process, promise and stats
* `order.html` : Order. Search, filters, 45 items in 6 sections, Office Box, sticky bag bar
* `find-us.html` : Visit. Address, hours, map, Office Box link
* `checkout.html` : Checkout. Bag, totals, form, WhatsApp lane, success message

Guests move through Home, About us, Order, Visit, plus Cart. The brand logo in the top bar is plain text by design, not a link.

## Tech stack

* HTML for content
* CSS in `css/style.css` plus Bootstrap 5.3.3 grid and buttons via CDN
* Vanilla JS in `js/script.js`, shared by every page
* Fonts: Playfair Display plus DM Sans via Google Fonts
* Images: local AVIF and JPG in `images/`
* Storage keys: `bb_cart_v2`, `bb_last_order_v1`, `bb_loyalty_v1`
* Design tokens in `:root`: `cream`, `espresso`, `gold`, `rust`

## Project structure

```text
brew and bakehouse
  index.html
  our-story.html
  order.html
  find-us.html
  checkout.html
  css/style.css
  js/script.js
  images/hero-image.avif
  images/story-home.avif
  images/story-visit.jpg
  README.md
```

One script serves all pages. Page specific blocks are guarded, so pages only run the code they need.

## Getting started

You need only a modern browser plus internet for the Bootstrap and Fonts CDN. Local images and all logic work offline after first load except the CDN parts.

1. Download or clone this folder.
2. Open `index.html` in a browser.
3. To edit with live reload, open the folder in VS Code and use Live Server.
4. Start at Home, go to Order, add items, open Cart to test checkout.

No install. No build. No terminal required.

## Accessibility and responsive

* Semantic landmarks, skip link, labeled controls and live regions for counts
* Keyboard reachable search, filters, bag controls and drawer menu
* Focus styles kept intact, icon only buttons carry `aria-label`
* Layout adapts from 1 column on phones to 3 columns on desktop via Bootstrap grid plus media queries plus fluid type with `clamp()`

## Credit

© 2026 Brew and Bakehouse. Roasted with care in Lagos.