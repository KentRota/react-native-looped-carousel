import React, {createRef, PureComponent} from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  ScrollView,
  View,
  ViewPropTypes,
  Pressable,
} from 'react-native';
import PropTypes from 'prop-types';
import isEqual from 'lodash.isequal';
import {IconKentRota, MyVideoPlayer} from "../../src/components/functions";
import {FULL_SCREEN_PIXELS} from "../../src/constants/constants";

const PAGE_CHANGE_DELAY = 3000,
    viewPropTypes = ViewPropTypes || View.propTypes;

/** Animasyon aciksa ve 1 den fazla item varsa donguye girer */
export default class Carousel extends PureComponent {
  static propTypes = {
    children: PropTypes.node.isRequired,
    autoplay: PropTypes.bool,
    delay: PropTypes.number,
    currentPage: PropTypes.number,
    style: viewPropTypes.style,
    pageStyle: viewPropTypes.style,
    contentContainerStyle: viewPropTypes.style,
    pageInfo: PropTypes.bool,
    pageInfoBackgroundColor: PropTypes.string,
    pageInfoTextStyle: Text.propTypes.style,
    pageInfoBottomContainerStyle: viewPropTypes.style,
    pageInfoPill: viewPropTypes.style,
    pageInfoPillIcon: viewPropTypes.style,
    pageInfoTextSeparator: PropTypes.string,
    bullets: PropTypes.bool,
    bulletsContainerStyle: Text.propTypes.style,
    bulletStyle: Text.propTypes.style,
    arrows: PropTypes.bool,
    arrowsContainerStyle: Text.propTypes.style,
    arrowStyle: Text.propTypes.style,
    leftArrowStyle: Text.propTypes.style,
    rightArrowStyle: Text.propTypes.style,
    leftArrowText: PropTypes.string,
    rightArrowText: PropTypes.string,
    chosenBulletStyle: Text.propTypes.style,
    onAnimateNextPage: PropTypes.func,
    onPageBeingChanged: PropTypes.func,
    getCurrentPageFunc: PropTypes.func,
    onPressPageInfoPill: PropTypes.func,
    swipe: PropTypes.bool,
    isLooped: PropTypes.bool,
  };
  static defaultProps = {
    delay: PAGE_CHANGE_DELAY,
    autoplay: true,
    pageInfo: false,
    bullets: false,
    arrows: false,
    pageInfoBackgroundColor: 'rgba(0, 0, 0, 0.25)',
    pageInfoTextSeparator: '/',
    currentPage: 0,
    style: undefined,
    pageStyle: undefined,
    contentContainerStyle: undefined,
    pageInfoTextStyle: undefined,
    pageInfoBottomContainerStyle: undefined,
    pageInfoPill: undefined,
    pageInfoPillIcon: undefined,
    bulletsContainerStyle: undefined,
    chosenBulletStyle: undefined,
    bulletStyle: undefined,
    arrowsContainerStyle: undefined,
    arrowStyle: undefined,
    leftArrowStyle: undefined,
    rightArrowStyle: undefined,
    leftArrowText: '',
    rightArrowText: '',
    onAnimateNextPage: undefined,
    onPageBeingChanged: undefined,
    getCurrentPageFunc: undefined,
    onPressPageInfoPill: undefined,
    swipe: true,
    isLooped: true,
  };

  constructor(props) {
    super(props);
    const size = {width: 0, height: 0};
    this.videoRef = createRef();
    if (props.children) {
      const childrenLength = React.Children.count(props.children) || 0;
      this.state = {
        currentPage: props.currentPage,
        size,
        childrenLength,
        contents: null,
        play_video: true,
      };
    } else {
      this.state = {size};
    }
    this.offset = 0;
    this.nextPage = 0;
  }

  componentDidMount() {
    if (this.state.childrenLength) {
      this._setUpTimer();
    }
  }

  componentWillUnmount() {
    this._clearTimer();
  }

  componentDidUpdate({children}) {
    if (!isEqual(this.props.children, children)) {
      const {currentPage} = this.state;
      this._clearTimer();
      let childrenLength = 0;
      if (children) {
        childrenLength = React.Children.count(children) || 1;
      }
      const nextPage = currentPage >= childrenLength ? childrenLength - 1 : currentPage;
      this.setState({childrenLength}, () => {
        this.animateToPage(nextPage);
        this._setUpTimer();
      });
    }
    if (!this.props.autoplay) {
      this._clearTimer();
    }
  }

  _setUpPages() {
    const {children: propsChildren, isLooped, pageStyle} = this.props,
        {size} = this.state,
        children = React.Children.toArray(propsChildren),
        pages = [];
    if (children && children.length > 1) {
      // tum sayfalari ekler
      pages.push(...children);
      // Sonsuz sayfa yapısını şu şekilde yapmak istiyoruz: 1-2-3-1-2
      // bu yüzden birinci ve ikinci sayfayı tekrar sonuna ekliyoruz
      if (isLooped) {
        pages.push(children[0]);
        pages.push(children[1]);
      }
    } else if (children) {
      pages.push(children[0]);
    } else {
      pages.push(
          <View>
            <Text>Carousel'in içine çocukları eklemeniz gerekiyor</Text>
          </View>
      );
    }
    const currentChild = this.props.children[this.state.currentPage],
        hasVideo = currentChild?.props?.item?.video ? false : false; //videolu calisma yapiliyor false degeri true yap
    return pages.map((page, i) => {
      let domainIndex = page?.props?.item?.video?.indexOf('http://', page?.props?.item?.video?.indexOf('http://') + 1);
      if (domainIndex === -1) {
        domainIndex = page?.props?.item?.video?.indexOf('https://', page?.props?.item?.video?.indexOf('https://') + 1);
      }
      return (
          <Pressable style={[{...size}, pageStyle]} key={i}>
            <View style={{flex: 1}}>
              {(hasVideo) ? (
                  <MyVideoPlayer
                      refVideo={(pVideo) => this.videoRef = pVideo}
                      props={{
                        campaign_uid: page.props.item.campaign_uid,
                        video: page?.props?.item?.video,
                        domainIndex: domainIndex,
                        play_video: this.state.play_video,
                        path: page.props.item.path,
                        videoHeight: FULL_SCREEN_PIXELS,
                      }}
                      customStyles={{
                        video: {borderRadius: 10},
                      }}
                      onProgress={(dataProgress) => {
                        if (dataProgress.currentTime >= 9) {
                          this.setState({play_video: false});
                        }
                      }}/>
              ) : null}
              {page}
            </View>
          </Pressable>
      )
    });
  }

  getCurrentPage() {
    return this.state.currentPage;
  }

  _setCurrentPage = (currentPage) => {
    this.setState({currentPage}, () => {
      if (this.props.onAnimateNextPage) {
        // FIXME: otomatik kaydırma ile ios'ta iki kez çağrılır
        this.props.onAnimateNextPage(currentPage);
      }
      if (this.props.getCurrentPageFunc) {
        this.props.getCurrentPageFunc(currentPage);
      }
    });
  };
  _onScrollBegin = () => {
    this._clearTimer();
  };
  _onScrollEnd = (event) => {
    const offset = {...event.nativeEvent.contentOffset},
        page = this._calculateCurrentPage(offset.x);
    this._placeCritical(page);
    this._setCurrentPage(page);
    this._setUpTimer();
  };
  _onScroll = (event) => {
    const currentOffset = event.nativeEvent.contentOffset.x,
        direction = currentOffset > this.offset ? 'right' : 'left';
    this.offset = currentOffset;
    const nextPage = this._calculateNextPage(direction);
    if (this.nextPage !== nextPage) {
      this.nextPage = nextPage;
      if (this.props.onPageBeingChanged) {
        this.props.onPageBeingChanged(this.nextPage);
      }
    }
  };
  _onLayout = (event) => {
    const {height, width} = event.nativeEvent.layout;
    this.setState({size: {width, height}});
    // ne zaman setTimeout kaldırmak istesek. https://github.com/facebook/react-native/issues/6849 burda cozulmus.
    setTimeout(() => this._placeCritical(this.state.currentPage), 0);
  };
  _clearTimer = () => {
    clearTimeout(this.timer);
  };
  _setUpTimer = () => {
    // sadece dongu için
    if (this.props.autoplay && React.Children.count(this.props.children) > 1) {
      this._clearTimer();
      // Mevcut öğeyi kontrol et
      const currentChild = this.props.children[this.state.currentPage],
          hasVideo = currentChild?.props?.item?.video ? true : false;
      // Gecikme süresini belirle (Video varsa 10 saniye, yoksa varsayılan 3 saniye)
      // videolu calisma yapiliyor 3000 degeri 10000 yap
      const delayTime = hasVideo ? 3000 : this.props.delay;
      this.timer = setTimeout(this._animateNextPage, delayTime);
    }
  };
  _scrollTo = ({offset, animated, nofix}) => {
    if (this.scrollView) {
      this.scrollView.scrollTo({y: 0, x: offset, animated});
      if (!nofix && Platform.OS === 'android' && !animated) {
        this.scrollView.scrollTo({y: 0, x: offset, animated: true});
      }
    }
  };
  _animateNextPage = () => {
    const {currentPage} = this.state,
        nextPage = this._normalizePageNumber(currentPage + 1);
    // donguyu engelleriz
    if (!this.props.isLooped && nextPage < currentPage) {
      return;
    }
    this.animateToPage(nextPage);
  };
  _animatePreviousPage = () => {
    const {currentPage} = this.state,
        nextPage = this._normalizePageNumber(currentPage - 1);
    // donguyu engelleriz
    if (!this.props.isLooped && nextPage > currentPage) {
      return;
    }
    this.animateToPage(nextPage);
  };
  animateToPage = (page) => {
    const {isLooped} = this.props,
        {currentPage, childrenLength, size: {width}} = this.state,
        nextPage = this._normalizePageNumber(page);
    this._clearTimer();
    if (nextPage === currentPage) {
      // pas geciyoruz
    } else if (nextPage === 0) {
      if (isLooped) {
        // yöne göre düzgün şekilde aksiyon alma
        if (currentPage !== childrenLength - 1) {
          this._scrollTo({offset: (childrenLength + 2) * width, animated: false, nofix: true});
        }
        this._scrollTo({offset: childrenLength * width, animated: true});
      } else {
        this._scrollTo({offset: 0, animated: true});
      }
    } else if (nextPage === 1) {
      // İlk sayfadan düzgün şekilde canlandırmak için önce görünümü orijinal konumuna taşımamız gerekir (döngülenmemişse gerekli değildir)
      if (currentPage === 0 && isLooped) {
        this._scrollTo({offset: 0, animated: false, nofix: true});
      }
      this._scrollTo({offset: width, animated: true});
    } else {
      // Son sayfanın "sınır" yoluyla ilk sayfaya atlamasına izin verilir
      if (currentPage === 0 && nextPage !== childrenLength - 1) {
        this._scrollTo({offset: 0, animated: false, nofix: true});
      }
      this._scrollTo({offset: nextPage * width, animated: true});
    }
    this._setCurrentPage(nextPage);
    this._setUpTimer();
  };
  _placeCritical = (page) => {
    const {isLooped} = this.props,
        {childrenLength, size: {width}} = this.state;
    let offset = 0;
    // sayfa numarası uzunluktan büyükse - bir sorun var
    if (page < childrenLength) {
      if (page === 0 && isLooped) {
        // "döngülenmiş" senaryoda ilk sayfa son sayfadan sonra yerleştirilmelidir
        offset = childrenLength * width;
      } else {
        offset = page * width;
      }
    }
    this._scrollTo({offset, animated: false});
  };
  _normalizePageNumber = (page) => {
    const {childrenLength} = this.state;
    if (page === childrenLength) {
      return 0;
    } else if (page > childrenLength) {
      return 1;
    } else if (page < 0) {
      return childrenLength - 1;
    }
    return page;
  };
  _calculateCurrentPage = (offset) => {
    const {width} = this.state.size,
        page = Math.round(offset / width);
    return this._normalizePageNumber(page);
  };
  _calculateNextPage = (direction) => {
    const {width} = this.state.size,
        ratio = this.offset / width,
        page = direction === 'right' ? Math.ceil(ratio) : Math.floor(ratio);
    return this._normalizePageNumber(page);
  };
  _renderPageInfo = (pageLength) => (
      <View style={(this.props.pageInfoBottomContainerStyle) ? this.props.pageInfoBottomContainerStyle : styles.pageInfoBottomContainer}>
        <Pressable onPress={this.props.onPressPageInfoPill} style={styles.pageInfoContainer}>
          <View style={{
            ...styles.pageInfoPill,
            ...this.props.pageInfoPill,
            backgroundColor: this.props.pageInfoBackgroundColor
          }}>
            {(this.props.pageInfoPillIcon?.iconFamily) ? (
                <IconKentRota
                    family={this.props.pageInfoPillIcon.iconFamily}
                    name={this.props.pageInfoPillIcon.icon}
                    size={this.props.pageInfoPillIcon.iconSize}
                    color={this.props.pageInfoPillIcon.iconColor}
                    style={this.props.pageInfoPillIcon.style}/>
            ) : null}
            <Text style={[styles.pageInfoText, this.props.pageInfoTextStyle]}>
              <Text style={{fontSize: (this.props.pageInfoPillIcon?.iconFamily) ? 16 : 14}}>{`${this.state.currentPage + 1}`}</Text>
              <Text style={{fontSize: (this.props.pageInfoPillIcon?.iconFamily) ? 16 : 14}}>{`${this.props.pageInfoTextSeparator}${pageLength}`}</Text>
            </Text>
          </View>
        </Pressable>
      </View>
  );
  _renderBullets = (pageLength) => {
    const bullets = [];
    for (let i = 0; i < pageLength; i += 1) {
      bullets.push(
          <Pressable onPress={() => this.animateToPage(i)} key={`bullet${i}`}>
            <View style={i === this.state.currentPage ? [styles.chosenBullet, this.props.chosenBulletStyle] : [styles.bullet, this.props.bulletStyle]}/>
          </Pressable>
      );
    }
    return (
        <View style={[styles.bullets, this.props.bulletsContainerStyle]} pointerEvents="box-none">
          {bullets}
        </View>
    );
  };
  _renderArrows = () => {
    let {currentPage} = this.state;
    const {childrenLength} = this.state;
    if (currentPage < 1) {
      currentPage = childrenLength;
    }
    return (
        <View style={styles.arrows} pointerEvents="box-none">
          <View style={[styles.arrowsContainer, this.props.arrowsContainerStyle]} pointerEvents="box-none">
            <Pressable onPress={this._animatePreviousPage} style={this.props.arrowStyle}>
              <Text style={this.props.leftArrowStyle}>
                {this.props.leftArrowText ? this.props.leftArrowText : 'Left'}
              </Text>
            </Pressable>
            <Pressable onPress={this._animateNextPage} style={this.props.arrowStyle}>
              <Text style={this.props.rightArrowStyle}>
                {this.props.rightArrowText ? this.props.rightArrowText : 'Right'}
              </Text>
            </Pressable>
          </View>
        </View>
    );
  };

  render() {
    const contents = this._setUpPages(),
        containerProps = {
          onLayout: this._onLayout,
          style: [this.props.style],
        },
        {size, childrenLength} = this.state;
    return (
        <View {...containerProps}>
          <ScrollView
              ref={(c) => {
                this.scrollView = c;
              }}
              onScrollBeginDrag={this._onScrollBegin}
              onMomentumScrollEnd={this._onScrollEnd}
              onScroll={this._onScroll}
              scrollEventThrottle={0}
              alwaysBounceHorizontal={false}
              alwaysBounceVertical={false}
              contentInset={{top: 0}}
              automaticallyAdjustContentInsets={false}
              showsHorizontalScrollIndicator={false}
              horizontal
              pagingEnabled
              bounces={false}
              scrollEnabled={this.props.swipe}
              contentContainerStyle={[
                styles.horizontalScroll,
                this.props.contentContainerStyle,
                {
                  width: size.width * (childrenLength + (childrenLength > 1 && this.props.isLooped ? 2 : 0)),
                  height: size.height,
                },
              ]}>
            {contents}
          </ScrollView>
          {this.props.arrows && this._renderArrows(this.state.childrenLength)}
          {this.props.bullets && this._renderBullets(this.state.childrenLength)}
          {this.props.pageInfo && this._renderPageInfo(this.state.childrenLength)}
        </View>
    );
  }
}

const styles = StyleSheet.create({
  horizontalScroll: {
    position: 'absolute',
  },
  pageInfoBottomContainer: {
    position: 'absolute',
    top: 10,
    right: 0,
    backgroundColor: 'transparent',
  },
  pageInfoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  pageInfoPill: {
    width: 50,
    height: 20,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageInfoText: {
    textAlign: 'center',
  },
  bullets: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    height: 30,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  arrows: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'transparent',
  },
  arrowsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chosenBullet: {
    margin: 10,
    width: 10,
    height: 10,
    borderRadius: 20,
    backgroundColor: 'white',
  },
  bullet: {
    margin: 10,
    width: 10,
    height: 10,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderColor: 'white',
    borderWidth: 1,
  },
});
