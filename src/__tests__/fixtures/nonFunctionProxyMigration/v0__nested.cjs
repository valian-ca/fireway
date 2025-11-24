module.exports = {
  migrate: async ({ firestore }) => {
    // Test non-function proxy paths by accessing nested collections/documents
    // This tests returning proxied references from methods

    // Get a collection reference and call methods on it that return other references
    const col = firestore.collection('test')
    const docRef = col.doc('parent')
    const nestedCol = docRef.collection('nested')
    const nestedDoc = nestedCol.doc('child')

    // Write to the nested document
    await nestedDoc.set({ data: 'nested' })

    // Test calling methods that return non-WriteBatch, non-CollectionReference, non-DocumentReference
    // This would test lines 52 and 178 and 271 (the generic return paths)
  },
}
