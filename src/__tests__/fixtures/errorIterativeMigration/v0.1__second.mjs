export const migrate = async ({ firestore }) => {
  await firestore.collection('data').doc('second').set({ key: 'value' })
}
