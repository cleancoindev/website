import * as React from 'react';
import {ZeroEx} from '0x.js';
import {AssetToken, Token} from 'ts/types';
import {Party} from 'ts/components/ui/party';
import {constants} from 'ts/utils/constants';

const PRECISION = 5;

interface VisualOrderProps {
    orderTakerAddress: string;
    orderMakerAddress: string;
    makerAssetToken: AssetToken;
    takerAssetToken: AssetToken;
    makerToken: Token;
    takerToken: Token;
    networkId: number;
    isMakerTokenAddressInRegistry: boolean;
    isTakerTokenAddressInRegistry: boolean;
}

interface VisualOrderState {}

export class VisualOrder extends React.Component<VisualOrderProps, VisualOrderState> {
    public render() {
        const makerImage = this.props.isMakerTokenAddressInRegistry ?
                           this.props.makerToken.iconUrl :
                           constants.DEFAULT_TOKEN_ICON_URL;
        const takerImage = this.props.isTakerTokenAddressInRegistry ?
                           this.props.takerToken.iconUrl :
                           constants.DEFAULT_TOKEN_ICON_URL;
        return (
            <div>
                <div className="clearfix">
                    <div className="col col-5 center">
                        <Party
                            label="Send"
                            address={this.props.takerToken.address}
                            alternativeImage={takerImage}
                            networkId={this.props.networkId}
                            isInTokenRegistry={this.props.isTakerTokenAddressInRegistry}
                        />
                    </div>
                    <div className="col col-2 center pt1">
                        <div className="pb1">
                            {this.renderAmount(this.props.takerAssetToken, this.props.takerToken)}
                        </div>
                        <div className="lg-p2 md-p2 sm-p1">
                            <img src="/images/trade_arrows.png" style={{width: 47}} />
                        </div>
                        <div className="pt1">
                            {this.renderAmount(this.props.makerAssetToken, this.props.makerToken)}
                        </div>
                    </div>
                    <div className="col col-5 center">
                        <Party
                            label="Receive"
                            address={this.props.makerToken.address}
                            alternativeImage={makerImage}
                            networkId={this.props.networkId}
                            isInTokenRegistry={this.props.isMakerTokenAddressInRegistry}
                        />
                    </div>
                </div>
            </div>
        );
    }
    private renderAmount(assetToken: AssetToken, token: Token) {
        const unitAmount = ZeroEx.toUnitAmount(assetToken.amount, token.decimals);
        return (
            <div style={{fontSize: 13}}>
                {unitAmount.toNumber().toFixed(PRECISION)} {token.symbol}
            </div>
        );
    }
}
