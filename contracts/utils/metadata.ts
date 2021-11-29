import path from 'path';
import fs from 'fs-extra';
import * as types from 'hardhat/internal/core/params/argumentTypes'; // TODO harhdat argument types not from internal
import {task} from 'hardhat/config';

task('export-metadata')
  .addPositionalParam(
    'dest',
    'destination folder where the metadata of deployed contracts will be written to',
    'metadata',
    types.string
  )
  .setAction(async (args, hre) => {
    const exportPath = args.dest || 'metadata';
    fs.emptyDirSync(exportPath);
    const network = hre.network.name;
    fs.emptyDirSync(path.join(exportPath, network));
    const deployments = await hre.deployments.all();
    for (const deploymentName of Object.keys(deployments)) {
      const deployment = deployments[deploymentName];
      if (deployment.metadata) {
        fs.writeFileSync(
          path.join(
            exportPath,
            network,
            `${deploymentName}_${deployment.address}.json`
          ),
          deployment.metadata
        );
      }
    }
  });
