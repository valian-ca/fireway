export const migrate = async ({ firestore }) => {
  await firestore.collection('data').doc('one').delete()
}
