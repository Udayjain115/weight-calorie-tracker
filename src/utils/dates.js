export const today = new Date().toISOString().slice(0, 10);

export function daysBetween(startDate, endDate) {
  return (new Date(endDate) - new Date(startDate)) / 86400000;
}

export function daysAgo(dateString, referenceDate = today) {
  return Math.floor((new Date(referenceDate) - new Date(dateString)) / 86400000);
}

export function rollingItems(items, startDay, endDay, referenceDate = today) {
  return items.filter((item) => {
    const age = daysAgo(item.date, referenceDate);
    return age >= startDay && age < endDay;
  });
}
