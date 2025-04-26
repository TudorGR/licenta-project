export async function up(queryInterface, Sequelize) {
  await queryInterface.addIndex("Events", ["day"]);
  await queryInterface.addIndex("Events", ["category", "day"]);
  await queryInterface.addIndex("Events", ["day", "timeStart"]);
  await queryInterface.addIndex("Events", ["userId", "day"]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeIndex("Events", ["day"]);
  await queryInterface.removeIndex("Events", ["category", "day"]);
  await queryInterface.removeIndex("Events", ["day", "timeStart"]);
  await queryInterface.removeIndex("Events", ["userId", "day"]);
}
