"use strict";

export async function up(queryInterface, Sequelize) {
  // Category mapping from old to new
  const categoryMapping = {
    Meeting: "Work",
    Workout: "Health & Wellness",
    Study: "Education",
    Personal: "Personal Tasks",
    Work: "Work",
    Social: "Social & Family",
    Family: "Social & Family",
    Health: "Health & Wellness",
    Hobby: "Leisure & Hobbies",
    Chores: "Personal Tasks",
    Travel: "Travel & Commute",
    Finance: "Finance & Bills",
    Learning: "Education",
    "Self-care": "Health & Wellness",
    Events: "Leisure & Hobbies",
    None: "Other",
  };

  // Get all events
  const events = await queryInterface.sequelize.query(
    "SELECT id, category FROM Events;",
    { type: Sequelize.QueryTypes.SELECT }
  );

  // Update each event with the new category
  for (const event of events) {
    const newCategory = categoryMapping[event.category] || "Other";

    await queryInterface.sequelize.query(
      `UPDATE Events SET category = ? WHERE id = ?;`,
      {
        replacements: [newCategory, event.id],
        type: Sequelize.QueryTypes.UPDATE,
      }
    );
  }
}

export async function down(queryInterface, Sequelize) {
  // If needed, you could implement a rollback strategy here
  // But since old categories aren't strictly preserved, this might not be practical
}
