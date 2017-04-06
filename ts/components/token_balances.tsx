import * as _ from 'lodash';
import * as React from 'react';
import {Toggle, FlatButton, Dialog} from 'material-ui';
import {Dispatcher} from 'ts/redux/dispatcher';
import {TokenBySymbol, Token, BlockchainErrs} from 'ts/types';
import {Blockchain} from 'ts/blockchain';
import {utils} from 'ts/utils/utils';
import {constants} from 'ts/utils/constants';
import {LifeCycleRaisedButton} from 'ts/components/ui/lifecycle_raised_button';
import {errorReporter} from 'ts/utils/error_reporter';
import {
    RaisedButton,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHeaderColumn,
    TableRowColumn,
} from 'material-ui';

const PRECISION = 5;
const ICON_DIMENSION = 40;
const ARTIFICIAL_ETHER_REQUEST_DELAY = 1000;
const DEFAULT_ALLOWANCE_AMOUNT = 1000000;
enum errorTypes {
  incorrectNetworkForFaucet,
};

interface TokenBalancesProps {
    blockchain: Blockchain;
    blockchainErr: BlockchainErrs;
    blockchainIsLoaded: boolean;
    dispatcher: Dispatcher;
    tokenBySymbol: TokenBySymbol;
    userEtherBalance: number;
}

interface TokenBalancesState {
    errorType: errorTypes;
    isErrorDialogOpen: boolean;
}

export class TokenBalances extends React.Component<TokenBalancesProps, TokenBalancesState> {
    public constructor(props: TokenBalancesProps) {
        super(props);
        this.state = {
            errorType: undefined,
            isErrorDialogOpen: false,
        };
    }
    public render() {
        const etherIconUrl = this.props.tokenBySymbol.WETH.iconUrl;
        const errorDialogActions = [
            <FlatButton
                label="Ok"
                primary={true}
                onTouchTap={this.onErrorDialogToggle.bind(this, false)}
            />,
        ];
        return (
            <div>
                <h3 className="px4 pt2 center">Test ether</h3>
                <div className="px2 pb2">
                    In order to try out the 0x protocol demo app, request some test ether to pay for
                    gas costs. It might take a bit of time for the test ether to show up.
                </div>
                <Table selectable={false}>
                    <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
                        <TableRow>
                            <TableHeaderColumn>Currency</TableHeaderColumn>
                            <TableHeaderColumn>Balance</TableHeaderColumn>
                            <TableHeaderColumn />
                            <TableHeaderColumn>Request from faucet</TableHeaderColumn>
                        </TableRow>
                    </TableHeader>
                    <TableBody displayRowCheckbox={false}>
                        <TableRow key="ETH">
                            <TableRowColumn>
                                <img
                                    style={{width: ICON_DIMENSION, height: ICON_DIMENSION}}
                                    src={etherIconUrl}
                                />
                            </TableRowColumn>
                            <TableRowColumn>{this.props.userEtherBalance.toFixed(PRECISION)} ETH</TableRowColumn>
                            <TableRowColumn />
                            <TableRowColumn>
                                <LifeCycleRaisedButton
                                    labelReady="Request"
                                    labelLoading="Requesting..."
                                    labelComplete="Request sent!"
                                    onClickAsyncFn={this.requestEtherAsync.bind(this)}
                                />
                            </TableRowColumn>
                        </TableRow>
                    </TableBody>
                </Table>
                <h3 className="px4 center pt2">Test tokens</h3>
                <div className="px2 pb2">
                    Mint some test tokens you'd like to use to generate or fill an order using 0x.
                </div>
                <Table selectable={false} bodyStyle={{height: 289}}>
                    <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
                        <TableRow>
                            <TableHeaderColumn>Token</TableHeaderColumn>
                            <TableHeaderColumn>Balance</TableHeaderColumn>
                            <TableHeaderColumn>0x exchange allowance</TableHeaderColumn>
                            <TableHeaderColumn>Mint test tokens</TableHeaderColumn>
                        </TableRow>
                    </TableHeader>
                    <TableBody displayRowCheckbox={false}>
                        {this.renderTableRows()}
                    </TableBody>
                </Table>
                <Dialog
                    title="Oh oh. Something went wrong"
                    actions={errorDialogActions}
                    open={this.state.isErrorDialogOpen}
                    onRequestClose={this.onErrorDialogToggle.bind(this, false)}
                >
                    {this.renderErrorDialogBody()}
                </Dialog>
            </div>
        );
    }
    private renderErrorDialogBody() {
        switch (this.state.errorType) {
            case errorTypes.incorrectNetworkForFaucet:
                return (
                    <div>
                        Our faucet can only send test Ether to addresses on the {constants.TESTNET_NAME}
                        {' '}testnet (networkId {constants.TESTNET_NETWORK_ID}). Please make sure you are
                        {' '}connected to the {constants.TESTNET_NAME} testnet and try requesting ether again.
                    </div>
                );

            case undefined:
                return; // No error to show

            default:
                throw utils.spawnSwitchErr('errorType', this.state.errorType);
        }
    }
    private renderTableRows() {
        if (!this.props.blockchainIsLoaded || this.props.blockchainErr !== '') {
            return '';
        }
        return _.map(this.props.tokenBySymbol, (token: Token) => {
            return (
                <TableRow key={token.iconUrl}>
                    <TableRowColumn>
                        <img
                            style={{width: ICON_DIMENSION, height: ICON_DIMENSION}}
                            src={token.iconUrl}
                        />
                    </TableRowColumn>
                    <TableRowColumn>{token.balance.toFixed(PRECISION)} {token.symbol}</TableRowColumn>
                    <TableRowColumn>
                        <div className="pl3">
                            <Toggle
                                toggled={this.isAllowanceSet(token)}
                                onToggle={this.onToggleAllowanceAsync.bind(this, token)}
                            />
                        </div>
                    </TableRowColumn>
                    <TableRowColumn>
                        <LifeCycleRaisedButton
                            labelReady="Mint"
                            labelLoading="Minting..."
                            labelComplete="Tokens minted!"
                            onClickAsyncFn={this.onMintTestTokensAsync.bind(this, token)}
                        />
                    </TableRowColumn>
                </TableRow>
            );
        });
    }
    private async onToggleAllowanceAsync(assetToken: Token) {
        // Hack: for some reason setting allowance to 0 causes a `base fee exceeds gas limit` exception
        // Any edits to this hack should include changes to the `isAllowanceSet` method below
        // TODO: Investigate root cause for why allowance cannot be set to 0
        let newAllowanceAmount = 1;
        if (!this.isAllowanceSet(assetToken)) {
            newAllowanceAmount = DEFAULT_ALLOWANCE_AMOUNT;
        }
        const token = this.props.tokenBySymbol[assetToken.symbol];
        try {
            await this.props.blockchain.setExchangeAllowanceAsync(token, newAllowanceAmount);
        } catch (err) {
            utils.consoleLog(`Unexpected error encountered: ${err}`);
            utils.consoleLog(err.stack);
            await errorReporter.reportAsync(err);
        }
    }
    private isAllowanceSet(token: Token) {
        return token.allowance !== 0 && token.allowance !== 1;
    }
    private async onMintTestTokensAsync(token: Token): Promise<boolean> {
        try {
            await this.props.blockchain.mintTestTokensAsync(token);
            return true;
        } catch (err) {
            const errMsg = '' + err;
            if (_.includes(errMsg, 'User has no associated addresses')) {
                this.props.dispatcher.updateShouldBlockchainErrDialogBeOpen(true);
                return false;
            }
            utils.consoleLog(`Unexpected error encountered: ${err}`);
            utils.consoleLog(err.stack);
            await errorReporter.reportAsync(err);
            return false;
        }
    }
    private async requestEtherAsync(): Promise<boolean> {
        const userAddressIfExists = await this.props.blockchain.getFirstAccountIfExistsAsync();
        if (_.isUndefined(userAddressIfExists) ||
            this.props.blockchainErr !== '') {
            this.props.dispatcher.updateShouldBlockchainErrDialogBeOpen(true);
            return false;
        }

        // If on another network other then the testnet our faucet serves test ether
        // from, we must show user an error message
        if (this.props.blockchain.networkId !== constants.TESTNET_NETWORK_ID) {
            this.setState({
                errorType: errorTypes.incorrectNetworkForFaucet,
            });
            this.onErrorDialogToggle(true);
            return false;
        }

        await utils.sleepAsync(ARTIFICIAL_ETHER_REQUEST_DELAY);

        const response = await fetch(`${constants.ETHER_FAUCET_ENDPOINT}/${userAddressIfExists}`);
        const responseBody = await response.text();
        if (response.status !== 200) {
            // TODO: Show error message in UI
            utils.consoleLog(`Unexpected status code: ${response.status} -> ${responseBody}`);
            await errorReporter.reportAsync(new Error(`Faucet returned non-200: ${JSON.stringify(response)}`));
            return false;
        }
    }
    private onErrorDialogToggle(isOpen: boolean) {
        this.setState({
            isErrorDialogOpen: isOpen,
        });
    }
}
