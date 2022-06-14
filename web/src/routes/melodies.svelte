<script>
  import Tabs from '$lib/components/tabs/Tabs.svelte';
  import TabList from '$lib/components/tabs/TabList.svelte';
  import TabPanel from '$lib/components/tabs/TabPanel.svelte';
  import Tab from '$lib/components/tabs/Tab.svelte';
  import MelodyListPage from '$lib/components/MelodyListPage.svelte';
</script>

<Tabs>
  <TabList>
    <Tab>Minted</Tab>
    <Tab>For Tomorrow</Tab>
    <Tab>Your</Tab>
  </TabList>

  <TabPanel>
    <MelodyListPage />
  </TabPanel>

  <TabPanel>
    <h2>TODO</h2>
  </TabPanel>

  <TabPanel>
    <h2>TODO</h2>
  </TabPanel>
</Tabs>
