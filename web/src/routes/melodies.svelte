<script>
  import Tabs from '$lib/components/tabs/Tabs.svelte';
  import TabList from '$lib/components/tabs/TabList.svelte';
  import TabPanel from '$lib/components/tabs/TabPanel.svelte';
  import Tab from '$lib/components/tabs/Tab.svelte';
  import Editor from '$lib/melodies/Editor.svelte';
  import MelodyListPage from '$lib/components/MelodyListPage.svelte';
</script>

<Tabs>
  <TabList>
    <Tab>Editor</Tab>
    <Tab>Minted</Tab>
    <Tab>Your</Tab>
  </TabList>

  <TabPanel>
    <Editor />
  </TabPanel>

  <TabPanel>
    <MelodyListPage />
  </TabPanel>

  <TabPanel>
    <h2>TODO</h2>
  </TabPanel>
</Tabs>
