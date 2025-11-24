const { FieldValue } = require('firebase-admin/firestore')

module.exports = {
  migrate: async ({ firestore }) => {
    // Test collection.add
    await firestore.collection('test').add({ added: true })

    // Test doc.create
    await firestore.collection('test').doc('created').create({ created: true })

    // Test doc.set with merge
    await firestore.collection('test').doc('merged').set({ merged: true }, { merge: true })

    // Test doc.update
    await firestore.collection('test').doc('updated').set({ field: 'old' })
    await firestore.collection('test').doc('updated').update({ field: 'new' })

    // Test doc.delete
    await firestore.collection('test').doc('deleted').set({ toDelete: true })
    await firestore.collection('test').doc('deleted').delete()

    // Test batch operations
    const batch = firestore.batch()
    batch.create(firestore.collection('test').doc('batch-created'), { batchCreated: true })
    batch.set(firestore.collection('test').doc('batch-set'), { batchSet: true })
    // Create the document first for batch.update
    await firestore.collection('test').doc('batch-updated').set({ initial: true })
    batch.update(firestore.collection('test').doc('batch-updated'), { batchUpdated: true })
    // Create the document first for batch.delete
    await firestore.collection('test').doc('batch-deleted').set({ toDelete: true })
    batch.delete(firestore.collection('test').doc('batch-deleted'))
    await batch.commit()

    // Test nested collections
    await firestore.collection('test').doc('parent').collection('nested').doc('child').set({ nested: true })

    // Test FieldValue.delete() for field deletion
    await firestore.collection('test').doc('field-delete').set({ field1: 'keep', field2: 'remove' })
    await firestore.collection('test').doc('field-delete').update({ field2: FieldValue.delete() })
  },
}
