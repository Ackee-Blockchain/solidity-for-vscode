import { SeverityItem } from './model/SeverityItem';
import { BaseTreeProvider } from './BaseTreeProvider';


export class SolcTreeDataProvider extends BaseTreeProvider {

    refresh(): void {
        this.clear();

        this.addRoot(new SeverityItem("error", this.context));
        this.addRoot(new SeverityItem("warning", this.context));
        this.addRoot(new SeverityItem("info", this.context));

        for (const [key, value] of this.detectionsMap) {
            value.forEach(detection => {
                let rootNode = this.rootNodesMap.get(detection.diagnostic.data.severity);

                if (rootNode != undefined) {
                    rootNode.addLeaf(detection);
                }
            });
        }

        this.rootNodes = this.rootNodes.filter(it => it.leafsCount > 0);

        this.sort();

        this.updateLabels();
        this._onDidChangeTreeData.fire(undefined);
    }
}
