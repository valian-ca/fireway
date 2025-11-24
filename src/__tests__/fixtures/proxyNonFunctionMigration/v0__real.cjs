module.exports = {
  migrate: async ({ firestore }) => {
    // Access non-function properties to test line 29, 66, 146, 198
    const col = firestore.collection('test')
    // Access the .id property (non-function)
    // eslint-disable-next-line no-console
    console.log('Collection ID:', col.id)
    // eslint-disable-next-line no-console
    console.log('Collection path:', col.path)

    const docRef = col.doc('test-doc')
    // Access non-function properties
    // eslint-disable-next-line no-console
    console.log('Doc ID:', docRef.id)
    // eslint-disable-next-line no-console
    console.log('Doc path:', docRef.path)

    // Create a batch and access its properties
    const batch = firestore.batch()
    // The batch itself doesn't have many non-function properties, but we can test accessing _committed

    // Test batch operations in real (non-dry-run) mode
    batch.create(col.doc('batch-create-real'), { real: true })
    batch.set(col.doc('batch-set-real'), { real: true })
    await col.doc('batch-update-real').set({ initial: true })
    batch.update(col.doc('batch-update-real'), { updated: true })
    await col.doc('batch-delete-real').set({ toDelete: true })
    batch.delete(col.doc('batch-delete-real'))
    await batch.commit()

    // Test non-batch operations in real mode (lines 203-209, etc.)
    await col.doc('create-real').create({ created: true })
    await col.doc('set-real').set({ set: true })
    await col.doc('set-merge-real').set({ merge: true }, { merge: true })
    await col.doc('update-real').set({ initial: true })
    await col.doc('update-real').update({ updated: true })
    await col.doc('delete-real').set({ toDelete: true })
    await col.doc('delete-real').delete()

    // Test collection.add in real mode
    await col.add({ added: true })

    // Test nested collection access (lines 251-256, 258-271)
    const parentDoc = col.doc('parent-real')
    await parentDoc.set({ parent: true })
    const nestedCol = parentDoc.collection('nested')
    await nestedCol.doc('child-real').set({ child: true })

    // Test methods that return other types (not WriteBatch, CollectionReference, or DocumentReference)
    // This tests the fallback return paths (lines 52, 126-127, 170-178, 258-271)
  },
}
