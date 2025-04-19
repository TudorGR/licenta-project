import { Sequelize } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("Events", "reminderEnabled", {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  });
  await queryInterface.addColumn("Events", "reminderTime", {
    type: Sequelize.INTEGER,
    defaultValue: 15,
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn("Events", "reminderEnabled");
  await queryInterface.removeColumn("Events", "reminderTime");
}
