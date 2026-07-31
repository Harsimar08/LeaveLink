// Small inline SVG logo exported as a data URL to avoid a missing asset file
const svg = `
<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>
  <rect rx='18' width='120' height='120' fill='%23ffffff'/>
  <g transform='translate(16 20)'>
    <rect x='0' y='10' width='88' height='60' rx='6' fill='%23c79a3a' opacity='0.95'/>
    <rect x='6' y='20' width='76' height='36' fill='%23ffffff' opacity='0.95'/>
    <text x='44' y='50' font-family='Inter, Arial' font-weight='700' font-size='20' fill='%230b1d30' text-anchor='middle'>JIMS</text>
  </g>
</svg>`

const JIMS_LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)

export default JIMS_LOGO