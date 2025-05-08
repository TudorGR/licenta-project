import React from "react";
import workIcon from "../assets/work.svg";
import educationIcon from "../assets/learning.svg"; // Using learning icon for Education
import healthIcon from "../assets/health.svg";
import financeIcon from "../assets/finance.svg";
import socialIcon from "../assets/social.svg"; // For Social & Family
import familyIcon from "../assets/family.svg"; // Alternative for Social & Family
import travelIcon from "../assets/travel.svg";
import personalIcon from "../assets/personal.svg";
import hobbyIcon from "../assets/hobby.svg";
import otherIcon from "../assets/other.svg"; // Default icon for Other

//Map categories to their respective icons
export const categoryIcons = {
  Work: workIcon,
  Education: educationIcon,
  "Health & Wellness": healthIcon,
  "Finance & Bills": financeIcon,
  "Social & Family": socialIcon,
  "Travel & Commute": travelIcon,
  "Personal Tasks": personalIcon,
  "Leisure & Hobbies": hobbyIcon,
  Other: otherIcon,
};

/**
 * Get the icon for a specific category
 * @param {string} category - The category name
 * @returns {string} - The icon URL
 */
export const getCategoryIcon = (category) => {
  return categoryIcons[category] || otherIcon;
};

export default categoryIcons;
