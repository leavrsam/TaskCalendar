
const ICAL = require('ical.js');
console.log('ICAL keys:', Object.keys(ICAL));
function parseHelper(rruleStr) {
    try {
        const cleanRule = rruleStr.replace(/^RRULE:/, '');
        const rule = ICAL.Recurrence.fromString(cleanRule);

        const result = {
            frequency: rule.freq ? rule.freq.toLowerCase() : 'none',
            interval: rule.interval || 1,
            count: rule.count || null,
            byDay: null,
            byMonthDay: null
        };

        if (rule.parts.BYDAY) {
            const dayMap = { 'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6 };
            // Simulate the backend logic
            result.byDay = rule.parts.BYDAY.map(d => {
                console.log('BYDAY part type:', typeof d, 'Value:', d, 'ToString:', d.toString());
                return dayMap[d] ?? dayMap[d.toString()];
            });
        }

        return result;
    } catch (e) {
        console.error('Error:', e);
        return null;
    }
}

// Test Cases
const cases = [
    "RRULE:FREQ=WEEKLY;BYDAY=MO",
    "RRULE:FREQ=WEEKLY;BYDAY=MO,TH",
    "RRULE:FREQ=MONTHLY;BYMONTHDAY=15",
    "RRULE:FREQ=DAILY;COUNT=5"
];

cases.forEach(c => {
    console.log('\nTesting:', c);
    console.log('Result:', parseHelper(c));
});
