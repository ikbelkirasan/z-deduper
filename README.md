# Custom Zapier Deduper

This library will allow you to build a Custom Zapier deduper for your advanced polling triggers use cases in your Zapier app.

## Installation

```shell
$ yarn add z-deduper
```

## Usage

**z-deduper** uses the Zapier Storage REST API behind the scenes to implement a custom deduper that will allow a polling trigger to compare the current API response records with the records that were cached by the deduper in order to determine which ones are new records and which ones are only updated records when the API doesn't include any timestamps to indicate when a record has been created or updated.

To get started, you'll need to create an instance of **z-deduper**, you can do it like so:

```js
const { getDeduper } = require("z-deduper");

const deduper = getDeduper("your_zap_id_goes_here");
```

Basically, the deduper should only run when the zap is enabled. You will need to take care of a few cases to get it to work properly.

**Initializing the deduper**

When the zap is turned on, Zapier will start populating its internal deduper and `bundle.meta.isPopulatingDedupe` will be set to `true`. At this point, you will have to initialize the deduper with as many records as possible (See the examples below).

```js
// ...

const contacts = await fetchContacts(z);

if (bundle.meta.isPopulatingDedupe) {
  // Initialize the custom deduper
  await deduper.initialize(contacts);
}

// ...
```

**Loading a sample**

When the user is testing the trigger, Zapier will run the trigger to fetch some samples. In this case, `bundle.meta.isLoadingSample` will be set to `true` and the deduper should be bypassed.

```js
const contacts = await fetchContacts(z);

if (bundle.meta.isLoadingSample) {
  // When the deduper cache is empty, it will actually return all the records
  const changes = deduper.findChanges(contacts);
  return changes.all;
}
```

**When the zap is polling for data**

When a polling interval comes around, the trigger should load the deduper cache first, call the `findChanges` method on the current API response records, and finally, it must call `persistChanges` to update the deduper cache.

`findChanges` method will return an object containing the following items:

- `created`: An array containing the newly created records only.
- `updated`: A an array containing the updated records only.
- `all`: A combination of `created` and `updated`.

```js
const contacts = await fetchContacts(z);

await deduper.load();
const changes = deduper.findChanges(contacts);
await deduper.persistChanges(contacts);

return changes.created; // or changes.updated;
```

### Example 01: New Contact

Here's a quick example showing how to use the custom deduper to detect new records.

```js
const zapier = require("zapier-platform-core");
const { getDeduper } = require("z-deduper");
const { apiUrl } = require("../config");

/**
 * Fetch a list of the contacts
 *
 * @param {zapier.ZObject} z
 */
async function fetchContacts(z) {
  // Make the request
  const response = await z.request({
    method: "GET",
    url: apiUrl,
  });
  const contacts = response.json;
  return contacts;
}

/**
 * On Contact Created
 *
 * @param {zapier.ZObject} z
 * @param {zapier.Bundle} bundle
 */
const perform = async (z, bundle) => {
  const zapId = bundle.meta.zap.id;
  if (!zapId) {
    throw new Error("Zap ID is required for the custom deduper to work");
  }
  // Get an instance of the custom deduper
  const deduper = getDeduper(zapId);

  // Fetch contacts from the API
  const contacts = await fetchContacts(z);

  if (bundle.meta.isPopulatingDedupe) {
    // Initialize the custom deduper
    await deduper.initialize(contacts);

    // Pass these to the Zapier Deduper
    const changes = deduper.findChanges(contacts);
    return changes.all;
  }

  if (bundle.meta.isLoadingSample) {
    const changes = deduper.findChanges(contacts);
    return changes.all;
  }

  // If we get here, it means that the zap is enabled
  // The follwing will run on each polling interval
  await deduper.load();
  const changes = deduper.findChanges(contacts);
  await deduper.persistChanges(contacts);

  // Returns only the newly created records
  return changes.created;
};
```

### Example 02: Updated Contact

In this example, the deduper will help in detecting which contacts have been updated even though the contacts don't have any timestamps.

```js
const zapier = require("zapier-platform-core");
const { getDeduper } = require("z-deduper");
const { apiUrl } = require("../config");

/**
 * Fetch a list of the contacts
 *
 * @param {ZObject} z
 */
async function fetchContacts(z) {
  // Make the request
  const response = await z.request({
    method: "GET",
    url: apiUrl,
  });
  const contacts = response.json;
  return contacts;
}

/**
 * On Contact updated
 *
 * @param {zapier.ZObject} z
 * @param {zapier.Bundle} bundle
 */
const perform = async (z, bundle) => {
  const zapId = bundle.meta.zap.id;
  if (!zapId) {
    throw new Error("Zap ID is required for the custom deduper to work");
  }
  // Get an instance of the custom deduper
  const deduper = getDeduper(zapId);

  // Fetch contacts from the API
  const contacts = await fetchContacts(z);

  if (bundle.meta.isPopulatingDedupe) {
    // Initialize the custom deduper
    await deduper.initialize(contacts);

    // Pass these to the Zapier Deduper
    const changes = deduper.findChanges(contacts);
    return changes.all;
  }

  if (bundle.meta.isLoadingSample) {
    const changes = deduper.findChanges(contacts);
    return changes.all;
  }

  // If we get here, it means that the zap is enabled
  // The follwing will run on each polling interval
  await deduper.load();
  const changes = deduper.findChanges(contacts);
  await deduper.persistChanges(contacts);

  // Returns only the updated records
  return changes.updated;
};
```

As you might have already noticed, both examples are very similar. The only difference is that the "New Contact" trigger will return `changes.created` whereas "Update Contact" will return `changes.updated`.

## License

MIT
